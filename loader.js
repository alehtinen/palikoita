// Content loader - parses content-source.md and generates contentData
// This script fetches the markdown file and converts it to the data structure

async function loadContentFromMarkdown() {
    try {
        const response = await fetch('content.md');
        const markdown = await response.text();
        
        return parseMarkdownContent(markdown);
    } catch (error) {
        // Only log when debug helper is present to avoid noisy console output in normal runs
        if (typeof window !== 'undefined' && window.DEBUG_LOG) window.DEBUG_LOG('Error loading content', error);
        return { content: [], mainTagDefinitions: {}, tagDefinitions: {} };
    }
}

function parseMarkdownContent(markdown) {
    const lines = markdown.split('\n');
    const mainTagDefinitions = {};
    const typeDefinitions = {};
    const tagDefinitions = {};
    const content = [];
    
    let currentSection = null;
    let currentItem = null;
    let itemId = 0;
    let currentBodyField = null; // Track if we're reading a multi-line body
    let isInLinkSection = false; // Track if we're in a #### Links: section
    let currentLinkSection = null; // Current link section being built (with title and links)
    let currentLinkItem = null; // Current link item being built
    let contentOrder = []; // Track order of body sections and link sections
    let bodyCounter = 0; // Counter for multiple body sections
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Check if this is a new field (starts with a known field name)
        // Note: Use '### ' to match only level-3 headers, not level-4/5/6
        const isNewField = trimmedLine.startsWith('### ') || 
                          trimmedLine.match(/^#{4,6} (Links:|Lähteet:|Body FI:|Body EN:)/) || // Stop body reading when link/sources/body section starts
                          trimmedLine.startsWith('URL:') ||
                          trimmedLine.startsWith('Type:') ||
                          trimmedLine.startsWith('Main Tag:') ||
                          trimmedLine.startsWith('Tags:') ||
                          trimmedLine.startsWith('Links:') ||
                          trimmedLine.startsWith('Links FI:') ||
                          trimmedLine.startsWith('Links EN:') ||
                          trimmedLine.startsWith('Description FI:') ||
                          trimmedLine.startsWith('Description EN:') ||
                          trimmedLine.startsWith('Description (fi):') ||
                          trimmedLine.startsWith('Description (en):') ||
                          trimmedLine.startsWith('Body FI:') ||
                          trimmedLine.startsWith('Body EN:') ||
                          trimmedLine.startsWith('Added:') ||
                          trimmedLine.startsWith('Updated:');
        


        // If we're reading a body field and encounter a new field (including a new body section of any language), end body reading
        if (currentBodyField && (isNewField || trimmedLine.match(/^#{4,6} Body (FI|EN)(\[\d+\])?:/))) {
            currentBodyField = null;
        }

        // Always reset currentBodyField when a new body section header is found
        if (trimmedLine.match(/^#{4,6} Body (FI|EN)(\[\d+\])?:/)) {
            currentBodyField = null;
        }

        // Continue reading body content (only for the most recent body part of the same language, and only if not a new field or new body section)
        if (currentBodyField && !isNewField && !trimmedLine.match(/^#{4,6} Body (FI|EN):/)) {
            if (!currentItem.bodyParts) currentItem.bodyParts = [];
            const currentBodyPart = currentItem.bodyParts[currentItem.bodyParts.length - 1];
            if (currentBodyPart && currentBodyPart.lang === currentBodyField) {
                if (trimmedLine === 'BBreak:') {
                    // Start a new body part with the same language
                    currentBodyPart.content = currentBodyPart.content.trim();
                    const newBodyPart = {
                        lang: currentBodyField,
                        content: '',
                        order: currentItem.contentOrder.length,
                        index: bodyCounter++
                    };
                    currentItem.bodyParts.push(newBodyPart);
                    currentItem.contentOrder.push({ type: 'body', index: newBodyPart.index });
                } else {
                    currentBodyPart.content += '\n' + line;
                }
            }
            continue;
        }
        
        // Skip empty lines (except when in body)
        if (!trimmedLine) continue;
        
        // Section headers
        if (trimmedLine === '## Main Tags') {
            currentSection = 'mainTags';
            continue;
        } else if (trimmedLine === '## Types') {
            currentSection = 'types';
            continue;
        } else if (trimmedLine === '## Tags') {
            currentSection = 'tags';
            continue;
        } else if (trimmedLine === '# Content') {
            currentSection = 'content';
            continue;
        }
        
        // Skip organizational ## headers within Content section (for .md organization only)
        if (currentSection === 'content' && trimmedLine.startsWith('## ')) {
            continue;
        }
        
        // Parse main tags
        if (currentSection === 'mainTags' && !trimmedLine.startsWith('#')) {
            // Format: mainTagId: FinnishLabel | EnglishLabel | color | image (optional)
            const parts = trimmedLine.split(':');
            if (parts.length === 2) {
                const mainTagId = parts[0].trim();
                const rest = parts[1].trim().split('|');
                if (rest.length >= 3) {
                    mainTagDefinitions[mainTagId] = {
                        fi: rest[0].trim(),
                        en: rest[1].trim(),
                        color: rest[2].trim(),
                        image: rest.length > 3 ? rest[3].trim() : ''
                    };
                }
            }
        }
        
        // Parse types
        if (currentSection === 'types' && !trimmedLine.startsWith('#')) {
            // Format: typeId: FinnishLabel | EnglishLabel
            const parts = trimmedLine.split(':');
            if (parts.length === 2) {
                const typeId = parts[0].trim();
                const rest = parts[1].trim().split('|');
                if (rest.length >= 2) {
                    typeDefinitions[typeId] = {
                        fi: rest[0].trim(),
                        en: rest[1].trim()
                    };
                }
            }
        }
        
        // Parse tags
        if (currentSection === 'tags' && !trimmedLine.startsWith('#')) {
            // Format: tagId: FinnishLabel | EnglishLabel | color | iconUrl (optional)
            const parts = trimmedLine.split(':');
            if (parts.length === 2) {
                const tagId = parts[0].trim();
                const rest = parts[1].trim().split('|');
                if (rest.length >= 3) {
                    tagDefinitions[tagId] = {
                        fi: rest[0].trim(),
                        en: rest[1].trim(),
                        color: rest[2].trim(),
                        icon: rest.length > 3 ? rest[3].trim() : ''
                    };
                }
            }
        }
        
        // Parse Content items
        if (currentSection === 'content' && trimmedLine.startsWith('### ')) {
            // Save the last link item if we were in a link section
            if (currentLinkItem && currentLinkSection) {
                currentLinkSection.links.push(currentLinkItem);
                currentLinkItem = null;
            }
            // Save the last link section if exists and add to contentOrder
            if (currentLinkSection && currentItem) {
                if (!currentItem.linkSections) currentItem.linkSections = [];
                if (!currentItem.contentOrder) currentItem.contentOrder = [];
                currentLinkSection.order = currentItem.contentOrder.length;
                console.log('[LOADER] Finalizing link section:', { 
                    title: currentLinkSection.title, 
                    shortName: currentLinkSection.shortName,
                    collapsed: currentLinkSection.collapsed,
                    linkCount: currentLinkSection.links.length 
                });
                currentItem.linkSections.push(currentLinkSection);
                currentItem.contentOrder.push({ type: 'links', index: currentItem.linkSections.length - 1 });
                currentLinkSection = null;
            }
            isInLinkSection = false;
            
            // Save previous item if exists
            if (currentItem) {
                content.push(currentItem);
            }
            
            currentBodyField = null; // Reset body field when starting new item
            bodyCounter = 0; // Reset body counter
            
            // Start new item
            // Format: ### FinnishTitle | EnglishTitle
            const titleParts = trimmedLine.substring(4).split('|');
            itemId++;
            currentItem = {
                id: itemId,
                title: {
                    fi: titleParts[0].trim(),
                    en: titleParts[1] ? titleParts[1].trim() : titleParts[0].trim()
                },
                description: { fi: '', en: '' },
                mainTag: '',
                tags: [],
                added: ''
            };
        }
        
        // Parse item properties
        if (currentItem) {
            // Check for new YAML-style link sections or sources sections (supports ####, #####, ######)
            const linkHeaderMatch = trimmedLine.match(/^(#{4,6}) (Links:|Lähteet:)(.*)$/);
            if (linkHeaderMatch) {
                // Save previous link item to previous section
                if (currentLinkItem && currentLinkSection) {
                    currentLinkSection.links.push(currentLinkItem);
                    currentLinkItem = null;
                }
                // Save previous link section if exists and record its position
                if (currentLinkSection) {
                    if (!currentItem.linkSections) currentItem.linkSections = [];
                    if (!currentItem.contentOrder) currentItem.contentOrder = [];
                    currentLinkSection.order = currentItem.contentOrder.length;
                    currentItem.linkSections.push(currentLinkSection);
                    currentItem.contentOrder.push({ type: 'links', index: currentItem.linkSections.length - 1 });
                }
                // Determine section type and title
                const headerLevel = linkHeaderMatch[1].length; // Number of # symbols
                const sectionType = linkHeaderMatch[2]; // 'Links:' or 'Lähteet:'
                const isSources = sectionType === 'Lähteet:';
                const titlePart = linkHeaderMatch[3].trim();
                const titleParts = titlePart.split('|');
                // Remove emojis from titles
                const removeEmojis = (str) => str.replace(/[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{E0020}-\u{E007F}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{231A}\u{231B}\u{2328}\u{23CF}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{24C2}\u{25AA}\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2600}-\u{2604}\u{260E}\u{2611}\u{2614}\u{2615}\u{2618}\u{261D}\u{2620}\u{2622}\u{2623}\u{2626}\u{262A}\u{262E}\u{262F}\u{2638}-\u{263A}\u{2640}\u{2642}\u{2648}-\u{2653}\u{2660}\u{2663}\u{2665}\u{2666}\u{2668}\u{267B}\u{267E}\u{267F}\u{2692}-\u{2697}\u{2699}\u{269B}\u{269C}\u{26A0}\u{26A1}\u{26AA}\u{26AB}\u{26B0}\u{26B1}\u{26BD}\u{26BE}\u{26C4}\u{26C5}\u{26C8}\u{26CE}\u{26CF}\u{26D1}\u{26D3}\u{26D4}\u{26E9}\u{26EA}\u{26F0}-\u{26F5}\u{26F7}-\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}\u{2712}\u{2714}\u{2716}\u{271D}\u{2721}\u{2728}\u{2733}\u{2734}\u{2744}\u{2747}\u{274C}\u{274E}\u{2753}-\u{2755}\u{2757}\u{2763}\u{2764}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}\u{2934}\u{2935}\u{2B05}-\u{2B07}\u{2B1B}\u{2B1C}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}\u{1F004}\u{1F0CF}\u{1F170}\u{1F171}\u{1F17E}\u{1F17F}\u{1F18E}\u{1F191}-\u{1F19A}\u{1F1E6}-\u{1F1FF}\u{1F201}\u{1F202}\u{1F21A}\u{1F22F}\u{1F232}-\u{1F23A}\u{1F250}\u{1F251}\u{1F300}-\u{1F321}\u{1F324}-\u{1F393}\u{1F396}\u{1F397}\u{1F399}-\u{1F39B}\u{1F39E}-\u{1F3F0}\u{1F3F3}-\u{1F3F5}\u{1F3F7}-\u{1F4FD}\u{1F4FF}-\u{1F53D}\u{1F549}-\u{1F54E}\u{1F550}-\u{1F567}\u{1F56F}\u{1F570}\u{1F573}-\u{1F57A}\u{1F587}\u{1F58A}-\u{1F58D}\u{1F590}\u{1F595}\u{1F596}\u{1F5A4}\u{1F5A5}\u{1F5A8}\u{1F5B1}\u{1F5B2}\u{1F5BC}\u{1F5C2}-\u{1F5C4}\u{1F5D1}-\u{1F5D3}\u{1F5DC}-\u{1F5DE}\u{1F5E1}\u{1F5E3}\u{1F5E8}\u{1F5EF}\u{1F5F3}\u{1F5FA}-\u{1F64F}\u{1F680}-\u{1F6C5}\u{1F6CB}-\u{1F6D2}\u{1F6E0}-\u{1F6E5}\u{1F6E9}\u{1F6EB}\u{1F6EC}\u{1F6F0}\u{1F6F3}-\u{1F6F9}\u{1F910}-\u{1F93A}\u{1F93C}-\u{1F93E}\u{1F940}-\u{1F945}\u{1F947}-\u{1F94C}\u{1F950}-\u{1F96B}\u{1F980}-\u{1F997}\u{1F9C0}\u{1F9D0}-\u{1F9E6}]/gu, '').trim();
                currentLinkSection = {
                    title: {
                        fi: titleParts[0] ? removeEmojis(titleParts[0].trim()) : (isSources ? 'Lähteet' : 'Lisätietoa'),
                        en: titleParts[1] ? removeEmojis(titleParts[1].trim()) : (isSources ? 'Sources' : 'More info')
                    },
                    links: [],
                    isSources: isSources, // Mark this section as sources
                    headerLevel: headerLevel // Store header level (4, 5, or 6)
                };
                isInLinkSection = true;
                currentLinkItem = null;
                continue;
            } else if (isInLinkSection && (trimmedLine.startsWith('###') || trimmedLine.startsWith('##') || trimmedLine.startsWith('Body'))) {
                // Exit link section when we hit another header or Body field
                if (currentLinkItem && currentLinkSection) {
                    currentLinkSection.links.push(currentLinkItem);
                    currentLinkItem = null;
                }
                if (currentLinkSection) {
                    if (!currentItem.linkSections) currentItem.linkSections = [];
                    if (!currentItem.contentOrder) currentItem.contentOrder = [];
                    currentLinkSection.order = currentItem.contentOrder.length;
                    currentItem.linkSections.push(currentLinkSection);
                    currentItem.contentOrder.push({ type: 'links', index: currentItem.linkSections.length - 1 });
                    currentLinkSection = null;
                }
                isInLinkSection = false;
                currentLinkItem = null;
            } else if (trimmedLine.match(/^#{4,6} Body FI:/)) {
                // Secondary body section with header (auto-indexed, supports color)
                const match = trimmedLine.match(/^(#{4,6}) Body FI:\s*(.*)$/);
                const headerLevel = match[1].length;
                const titleAndContent = match[2].trim();
                let title = '';
                let content = '';
                let headerColor = undefined;
                if (titleAndContent.includes('|')) {
                    const parts = titleAndContent.split('|');
                    title = parts[0].trim();
                    // If there are 3+ parts, treat last as color, middle as content
                    if (parts.length > 2) {
                        content = parts.slice(1, -1).join('|').trim();
                        headerColor = parts[parts.length - 1].trim();
                    } else {
                        content = parts[1].trim();
                        // If the content looks like a color (single word, no spaces), treat as color
                        if (/^[a-zA-Z]+$/.test(content)) {
                            headerColor = content;
                            content = '';
                        }
                    }
                } else {
                    title = titleAndContent;
                    content = '';
                }
                const idx = bodyCounter++;
                const newBodyPart = {
                    lang: 'fi',
                    content: content,
                    title: title,
                    order: currentItem.contentOrder.length,
                    index: idx,
                    headerLevel: headerLevel,
                    headerColor: headerColor
                };
                if (!currentItem.bodyParts) currentItem.bodyParts = [];
                if (!currentItem.contentOrder) currentItem.contentOrder = [];
                currentItem.bodyParts.push(newBodyPart);
                currentItem.contentOrder.push({ type: 'body', index: newBodyPart.index });
                currentBodyField = 'fi';
            } else if (trimmedLine.match(/^#{4,6} Body EN:/)) {
                // Secondary body section with header (auto-indexed, supports color)
                const match = trimmedLine.match(/^(#{4,6}) Body EN:\s*(.*)$/);
                const headerLevel = match[1].length;
                const titleAndContent = match[2].trim();
                let title = '';
                let content = '';
                let headerColor = undefined;
                if (titleAndContent.includes('|')) {
                    const parts = titleAndContent.split('|');
                    title = parts[0].trim();
                    if (parts.length > 2) {
                        content = parts.slice(1, -1).join('|').trim();
                        headerColor = parts[parts.length - 1].trim();
                    } else {
                        content = parts[1].trim();
                        if (/^[a-zA-Z]+$/.test(content)) {
                            headerColor = content;
                            content = '';
                        }
                    }
                } else {
                    title = titleAndContent;
                    content = '';
                }
                const idx = bodyCounter++;
                const newBodyPart = {
                    lang: 'en',
                    content: content,
                    title: title,
                    order: currentItem.contentOrder.length,
                    index: idx,
                    headerLevel: headerLevel,
                    headerColor: headerColor
                };
                if (!currentItem.bodyParts) currentItem.bodyParts = [];
                if (!currentItem.contentOrder) currentItem.contentOrder = [];
                currentItem.bodyParts.push(newBodyPart);
                currentItem.contentOrder.push({ type: 'body', index: newBodyPart.index });
                currentBodyField = 'en';
            } else if (!trimmedLine.match(/^#{4,6}/) && trimmedLine.startsWith('Body FI: ')) {
                // Only run old-style handler if not a header
                if (window.DEBUG_LOG) window.DEBUG_LOG('Found old-style Body FI at line, creating fi body part', { line: i, title: currentItem?.title?.fi });
                if (!currentItem.bodyParts) currentItem.bodyParts = [];
                if (!currentItem.contentOrder) currentItem.contentOrder = [];
                const newBodyPart = {
                    lang: 'fi',
                    content: trimmedLine.substring(9).trim(),
                    order: currentItem.contentOrder.length,
                    index: bodyCounter++
                };
                currentItem.bodyParts.push(newBodyPart);
                currentItem.contentOrder.push({ type: 'body', index: newBodyPart.index });
                currentBodyField = 'fi'; // Start reading multi-line body
            } else if (!trimmedLine.match(/^#{4,6}/) && trimmedLine.startsWith('Body EN: ')) {
                // Only run old-style handler if not a header
                if (window.DEBUG_LOG) window.DEBUG_LOG('Found old-style Body EN at line, creating en body part', { line: i, title: currentItem?.title?.en });
                if (!currentItem.bodyParts) currentItem.bodyParts = [];
                if (!currentItem.contentOrder) currentItem.contentOrder = [];
                const newBodyPart = {
                    lang: 'en',
                    content: trimmedLine.substring(9).trim(),
                    order: currentItem.contentOrder.length,
                    index: bodyCounter++
                };
                currentItem.bodyParts.push(newBodyPart);
                currentItem.contentOrder.push({ type: 'body', index: newBodyPart.index });
                currentBodyField = 'en'; // Start reading multi-line body
            } else if (isInLinkSection) {
                // Parse YAML-style link items
                if (trimmedLine.startsWith('- Name:')) {
                    // Save previous link item if exists
                    if (currentLinkItem && currentLinkSection) {
                        currentLinkSection.links.push(currentLinkItem);
                    }
                    // Start new link item
                    const namePart = trimmedLine.substring(7).trim();
                    const nameParts = namePart.split('|');
                    currentLinkItem = {
                        name: {
                            fi: nameParts[0] ? nameParts[0].trim() : '',
                            en: nameParts[1] ? nameParts[1].trim() : nameParts[0] ? nameParts[0].trim() : ''
                        }
                    };
                } else if (currentLinkItem) {
                    // Parse link item properties
                    if (trimmedLine.startsWith('URL FI:')) {
                        if (!currentLinkItem.url) currentLinkItem.url = { fi: '', en: '' };
                        currentLinkItem.url.fi = trimmedLine.substring(7).trim();
                    } else if (trimmedLine.startsWith('URL EN:')) {
                        if (!currentLinkItem.url) currentLinkItem.url = { fi: '', en: '' };
                        currentLinkItem.url.en = trimmedLine.substring(7).trim();
                    } else if (trimmedLine.startsWith('URL Contact:')) {
                        // Contact URL for this specific link item
                        const url = trimmedLine.substring(12).trim();
                        currentLinkItem.urlContact = url;
                    } else if (trimmedLine.startsWith('URL:')) {
                        // Universal URL (same for both languages)
                        const url = trimmedLine.substring(4).trim();
                        currentLinkItem.url = { fi: url, en: url };
                    } else if (trimmedLine.startsWith('Contact:')) {
                        // Contact flag for this specific link item
                        const contactValue = trimmedLine.substring(8).trim().toLowerCase();
                        currentLinkItem.isContact = contactValue === 'true' || contactValue === 'yes';
                    } else if (trimmedLine.match(/^#{4,6} Body FI:/)) {
                        if (!currentLinkItem.description) currentLinkItem.description = { fi: '', en: '' };
                        currentLinkItem.description.fi = trimmedLine.substring(15).trim();
                    } else if (trimmedLine.startsWith('Description EN:')) {
                        if (!currentLinkItem.description) currentLinkItem.description = { fi: '', en: '' };
                        currentLinkItem.description.en = trimmedLine.substring(15).trim();
                    } else if (trimmedLine.startsWith('Description:')) {
                        // Universal description (same for both languages)
                        const desc = trimmedLine.substring(12).trim();
                        currentLinkItem.description = { fi: desc, en: desc };
                    } else if (trimmedLine.startsWith('Author:')) {
                        currentLinkItem.author = trimmedLine.substring(7).trim();
                    } else if (trimmedLine.startsWith('Date:')) {
                        currentLinkItem.date = trimmedLine.substring(5).trim();
                    } else if (trimmedLine.startsWith('Retrieved:')) {
                        currentLinkItem.retrieved = trimmedLine.substring(10).trim();
                    } else if (trimmedLine.startsWith('Pages:')) {
                        currentLinkItem.pages = trimmedLine.substring(6).trim();
                    }
                } else if (currentLinkSection && !currentLinkItem) {
                    // Parse link section properties (when not inside a link item)
                    if (trimmedLine.startsWith('Short Name:')) {
                        const shortNamePart = trimmedLine.substring(11).trim();
                        const shortNameParts = shortNamePart.split('|');
                        currentLinkSection.shortName = {
                            fi: shortNameParts[0] ? shortNameParts[0].trim() : '',
                            en: shortNameParts[1] ? shortNameParts[1].trim() : (shortNameParts[0] ? shortNameParts[0].trim() : '')
                        };
                        console.log('[LOADER] Parsed link section Short Name:', currentLinkSection.shortName);
                    } else if (trimmedLine.startsWith('Collapsed:')) {
                        const collapsedValue = trimmedLine.substring(10).trim().toLowerCase();
                        currentLinkSection.collapsed = collapsedValue === 'true' || collapsedValue === 'yes';
                        console.log('[LOADER] Parsed link section Collapsed:', currentLinkSection.collapsed);
                    }
                }
            } else if (trimmedLine.startsWith('URL: ')) {
                currentItem.url = trimmedLine.substring(5).trim();
            } else if (trimmedLine.startsWith('URL Name: ')) {
                // URL Name with language support: URL Name: Suomeksi | English
                const namePart = trimmedLine.substring(10).trim();
                const nameParts = namePart.split('|');
                if (!currentItem.urlName) currentItem.urlName = { fi: '', en: '' };
                currentItem.urlName.fi = nameParts[0] ? nameParts[0].trim() : '';
                currentItem.urlName.en = nameParts[1] ? nameParts[1].trim() : nameParts[0] ? nameParts[0].trim() : '';
            } else if (trimmedLine.startsWith('URL Description: ')) {
                const descPart = trimmedLine.substring(17).trim();
                const descParts = descPart.split('|');
                if (!currentItem.urlDescription) currentItem.urlDescription = { fi: '', en: '' };
                currentItem.urlDescription.fi = descParts[0] ? descParts[0].trim() : '';
                currentItem.urlDescription.en = descParts[1] ? descParts[1].trim() : descParts[0] ? descParts[0].trim() : '';
            } else if (trimmedLine.startsWith('URL Contact: ')) {
                // Contact URL - separate URL for contact information
                currentItem.urlContact = trimmedLine.substring(13).trim();
            } else if (trimmedLine.startsWith('Contact: ')) {
                // Contact flag - indicates if main URL is a contact link
                const contactValue = trimmedLine.substring(9).trim().toLowerCase();
                currentItem.isContactUrl = contactValue === 'true' || contactValue === 'yes';
            } else if (trimmedLine.startsWith('Icon: ')) {
                currentItem.icon = trimmedLine.substring(6).trim();
            } else if (trimmedLine.startsWith('Short Name: ')) {
                // Short name for use in link lists (bilingual)
                const shortNamePart = trimmedLine.substring(12).trim();
                const shortNameParts = shortNamePart.split('|');
                currentItem.shortName = {
                    fi: shortNameParts[0] ? shortNameParts[0].trim() : '',
                    en: shortNameParts[1] ? shortNameParts[1].trim() : (shortNameParts[0] ? shortNameParts[0].trim() : '')
                };
            } else if (trimmedLine.startsWith('Collapsed: ')) {
                // Whether link sections should be collapsed by default in link lists
                const collapsedValue = trimmedLine.substring(11).trim().toLowerCase();
                currentItem.collapsed = collapsedValue === 'true' || collapsedValue === 'yes';
            } else if (/^(card|id): /i.test(trimmedLine)) {
                // Optional explicit ID/Card slug provided by author (use `ID:` preferred). Keep both fields for compatibility.
                const idVal = trimmedLine.replace(/^(card|id):\s*/i, '').trim();
                currentItem.id = idVal;
                currentItem.card = idVal; // backward compatibility
            } else if (trimmedLine.startsWith('Type: ')) {
                currentItem.type = trimmedLine.substring(6).trim();
            } else if (trimmedLine.startsWith('Main Tag: ')) {
                const mainTagValue = trimmedLine.substring(10).trim();
                // Support multiple main tags separated by commas
                if (mainTagValue.includes(',')) {
                    currentItem.mainTags = mainTagValue.split(',').map(t => t.trim());
                    currentItem.mainTag = currentItem.mainTags[0]; // Backward compatibility
                } else {
                    currentItem.mainTag = mainTagValue;
                }
            } else if (trimmedLine.startsWith('Tags: ')) {
                const tagList = trimmedLine.substring(6).trim();
                currentItem.tags = tagList.split(',').map(t => t.trim());
            } else if (trimmedLine.startsWith('Links FI: ')) {
                // Old pipe-delimited format (backward compatibility)
                const linkList = trimmedLine.substring(10).trim();
                if (!currentItem.linksFI) currentItem.linksFI = [];
                currentItem.linksFI = parseLinkList(linkList);
            } else if (trimmedLine.startsWith('Links EN: ')) {
                // Old pipe-delimited format (backward compatibility)
                const linkList = trimmedLine.substring(10).trim();
                if (!currentItem.linksEN) currentItem.linksEN = [];
                currentItem.linksEN = parseLinkList(linkList);
            } else if (trimmedLine.startsWith('Added: ')) {
                currentItem.added = trimmedLine.substring(7).trim();
            } else if (trimmedLine.startsWith('Updated: ')) {
                currentItem.updated = trimmedLine.substring(9).trim();
            } else if (trimmedLine.startsWith('Last Checked: ')) {
                currentItem.lastChecked = trimmedLine.substring(14).trim();
            } else if (trimmedLine.startsWith('PDF: ')) {
                const pdfValue = trimmedLine.substring(5).trim().toLowerCase();
                currentItem.downloadablePDF = pdfValue === 'true' || pdfValue === 'yes';
            } else if (trimmedLine.startsWith('Keywords: ')) {
                // Keywords for search (bilingual) - Format: Keywords: FinnishKeywords | EnglishKeywords
                // Each side can have comma-separated keywords
                const keywordsPart = trimmedLine.substring(10).trim();
                const keywordParts = keywordsPart.split('|');
                currentItem.keywords = {
                    fi: keywordParts[0] ? keywordParts[0].trim() : '',
                    en: keywordParts[1] ? keywordParts[1].trim() : (keywordParts[0] ? keywordParts[0].trim() : '')
                };
            } else if (trimmedLine.startsWith('Description FI: ') || trimmedLine.startsWith('Description (fi): ')) {
                currentItem.description.fi = trimmedLine.includes('(fi)') ? trimmedLine.substring(18).trim() : trimmedLine.substring(16).trim();
            } else if (trimmedLine.startsWith('Description EN: ') || trimmedLine.startsWith('Description (en): ')) {
                currentItem.description.en = trimmedLine.includes('(en)') ? trimmedLine.substring(18).trim() : trimmedLine.substring(16).trim();
            } else if (trimmedLine.startsWith('Body FI: ')) {
                if (window.DEBUG_LOG) window.DEBUG_LOG('Found Body FI at line, creating fi body part', {line: i, title: currentItem?.title?.fi});
                // Create new body part
                if (!currentItem.bodyParts) currentItem.bodyParts = [];
                if (!currentItem.contentOrder) currentItem.contentOrder = [];
                const newBodyPart = {
                    lang: 'fi',
                    content: trimmedLine.substring(9).trim(),
                    order: currentItem.contentOrder.length,
                    index: bodyCounter++
                };
                currentItem.bodyParts.push(newBodyPart);
                currentItem.contentOrder.push({ type: 'body', index: newBodyPart.index });
                currentBodyField = 'fi'; // Start reading multi-line body
            } else if (trimmedLine.startsWith('Body EN: ')) {
                if (window.DEBUG_LOG) window.DEBUG_LOG('Found Body EN at line, creating en body part', {line: i, title: currentItem?.title?.en});
                // Create new body part
                if (!currentItem.bodyParts) currentItem.bodyParts = [];
                if (!currentItem.contentOrder) currentItem.contentOrder = [];
                const newBodyPart = {
                    lang: 'en',
                    content: trimmedLine.substring(9).trim(),
                    order: currentItem.contentOrder.length,
                    index: bodyCounter++
                };
                currentItem.bodyParts.push(newBodyPart);
                currentItem.contentOrder.push({ type: 'body', index: newBodyPart.index });
                currentBodyField = 'en'; // Start reading multi-line body
            }
        }
    }
    
    // Add last link item to section if exists
    if (currentLinkItem && currentLinkSection) {
        currentLinkSection.links.push(currentLinkItem);
    }
    // Add last link section if exists and add to contentOrder
    if (currentLinkSection && currentItem) {
        if (!currentItem.linkSections) currentItem.linkSections = [];
        if (!currentItem.contentOrder) currentItem.contentOrder = [];
        currentLinkSection.order = currentItem.contentOrder.length;
        currentItem.linkSections.push(currentLinkSection);
        currentItem.contentOrder.push({ type: 'links', index: currentItem.linkSections.length - 1 });
    }
    
    // Add last item
    if (currentItem) {
        content.push(currentItem);
    }
    
    // Debug logging for each content item (no-op unless debug helper is present)
    content.forEach((item, idx) => {
        if (window.DEBUG_LOG) {
            window.DEBUG_LOG('parse item', { idx: idx + 1, title: item.title?.fi || item.title?.en || 'no title' });
            if (item.bodyParts) {
                item.bodyParts.forEach((bp, i) => {
                    window.DEBUG_LOG('parse bodyPart', { idx: idx + 1, partIndex: i, lang: bp.lang, index: bp.index, order: bp.order, headerLevel: bp.headerLevel, title: bp.title, contentPreview: (bp.content||'').slice(0,40) });
                });
            }
            if (item.contentOrder) {
                window.DEBUG_LOG('parse contentOrder', { idx: idx + 1, contentOrder: item.contentOrder });
            }
            if (item.linkSections) {
                item.linkSections.forEach((section, i) => {
                    window.DEBUG_LOG('parse linkSection', { 
                        idx: idx + 1, 
                        sectionIndex: i, 
                        title: section.title,
                        shortName: section.shortName,
                        collapsed: section.collapsed,
                        linkCount: section.links.length
                    });
                });
            }
        }
    });

    return { content, mainTagDefinitions, typeDefinitions, tagDefinitions };
}

// Parse link list - format: URL | Name | Description
function parseLinkList(linkString) {
    return linkString.split(',').map(linkItem => {
        const parts = linkItem.trim().split('|');
        if (parts.length === 3) {
            return {
                url: parts[0].trim(),
                name: parts[1].trim(),
                description: parts[2].trim()
            };
        } else if (parts.length === 2) {
            return {
                url: parts[0].trim(),
                name: parts[1].trim(),
                description: ''
            };
        } else {
            // Legacy format - just URL
            return {
                url: parts[0].trim(),
                name: parts[0].trim(),
                description: ''
            };
        }
    });
}

// Convert basic markdown to HTML
function markdownToHtml(text) {
    if (!text) return '';
    
    let html = text;
    
    // Handle bold **text** FIRST (before splitting into paragraphs to avoid conflicts)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Split by double newlines for paragraphs
    const blocks = html.split('\n\n');
    const processedBlocks = [];
    
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i].trim();
        if (!block) continue;
        
        // Check if this is an Obsidian-style callout
        const calloutMatch = block.match(/^>\[!(info|question|note|quote|warning|tip|success|danger|error|bug|example|important)\](.*)$/im);
        if (calloutMatch) {
            const calloutType = calloutMatch[1].toLowerCase();
            const title = calloutMatch[2].trim() || (calloutType.charAt(0).toUpperCase() + calloutType.slice(1));
            
            // Check if next block exists and is the content (not another callout or special formatting)
            let content = '';
            if (i + 1 < blocks.length) {
                const nextBlock = blocks[i + 1].trim();
                if (nextBlock && !nextBlock.match(/^>\[!/) && !nextBlock.match(/^#{1,6}\s/)) {
                    content = nextBlock;
                    i++; // Skip next block
                }
            }
            
            // Define colors and icons for different callout types
            const calloutStyles = {
                info: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-500', text: 'text-blue-900 dark:text-blue-100', icon: 'ⓘ' },
                question: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500', text: 'text-purple-900 dark:text-purple-100', icon: '?' },
                note: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-500', text: 'text-cyan-900 dark:text-cyan-100', icon: '✎' },
                quote: { bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-500', text: 'text-gray-900 dark:text-gray-100', icon: '‟' },
                warning: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-500', text: 'text-yellow-900 dark:text-yellow-100', icon: '⚠' },
                tip: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500', text: 'text-green-900 dark:text-green-100', icon: '★' },
                success: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-500', text: 'text-green-900 dark:text-green-100', icon: '✓' },
                danger: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500', text: 'text-red-900 dark:text-red-100', icon: '⊗' },
                error: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500', text: 'text-red-900 dark:text-red-100', icon: '✗' },
                bug: { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-500', text: 'text-red-900 dark:text-red-100', icon: '⚙' },
                example: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-500', text: 'text-purple-900 dark:text-purple-100', icon: '◉' },
                important: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-500', text: 'text-orange-900 dark:text-orange-100', icon: '!' }
            };
            
            const style = calloutStyles[calloutType] || calloutStyles.info;
            
            processedBlocks.push(`
                <div class="my-4 p-4 rounded-lg border-l-4 ${style.border} ${style.bg}">
                    <div class="flex items-start gap-2">
                        <span class="text-lg flex-shrink-0">${style.icon}</span>
                        <div class="flex-1">
                            <div class="font-semibold ${style.text} mb-1">${title}</div>
                            ${content ? `<div class="${style.text} opacity-90">${content}</div>` : ''}
                        </div>
                    </div>
                </div>
            `);
            continue;
        }
        
        // Split block into lines
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        
        // Separate bold-only lines from list items
        const result = [];
        let currentList = [];
        let currentListType = null; // 'numbered', 'bullet', or null
        
        for (const line of lines) {
            // Check if line is a markdown header (####, #####, ######)
            const h6Match = line.match(/^######\s+(.+)$/);
            const h5Match = line.match(/^#####\s+(.+)$/);
            const h4Match = line.match(/^####\s+(.+)$/);
            
            // Check if line is bold-only (heading)
            const isBoldOnly = line.match(/^<strong>.+<\/strong>$/);
            
            // Check if line is a list item
            const isNumbered = line.match(/^\d+\.\s/);
            const isBullet = line.match(/^[-*]\s/);
            
            if (h6Match) {
                // Flush current list if any
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<h6 class="text-sm font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">${h6Match[1]}</h6>`);
            } else if (h5Match) {
                // Flush current list if any
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<h5 class="text-base font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">${h5Match[1]}</h5>`);
            } else if (h4Match) {
                // Flush current list if any
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<h4 class="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">${h4Match[1]}</h4>`);
            } else if (isBoldOnly) {
                // Flush current list if any
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                // Add bold text as paragraph
                result.push(`<p>${line}</p>`);
            } else if (isNumbered) {
                // Flush if switching list types
                if (currentListType === 'bullet' && currentList.length > 0) {
                    result.push(`<ul class="list-disc list-inside my-4">${currentList.join('')}</ul>`);
                    currentList = [];
                }
                currentListType = 'numbered';
                const text = line.replace(/^\d+\.\s/, '').trim();
                currentList.push(`<li>${text}</li>`);
            } else if (isBullet) {
                // Flush if switching list types
                if (currentListType === 'numbered' && currentList.length > 0) {
                    result.push(`<ol class="list-decimal list-inside my-4">${currentList.join('')}</ol>`);
                    currentList = [];
                }
                currentListType = 'bullet';
                const text = line.replace(/^[-*]\s/, '').trim();
                currentList.push(`<li>${text}</li>`);
            } else {
                // Flush current list if any
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                // Regular text
                result.push(`<p>${line}</p>`);
            }
        }
        
        // Flush any remaining list
        if (currentList.length > 0) {
            if (currentListType === 'numbered') {
                result.push(`<ol class="list-decimal list-inside my-4">${currentList.join('')}</ol>`);
            } else if (currentListType === 'bullet') {
                result.push(`<ul class="list-disc list-inside my-4">${currentList.join('')}</ul>`);
            }
        }
        
        processedBlocks.push(result.join('\n'));
    }
    
    html = processedBlocks.join('\n');
    
    // Handle italic *text* (AFTER bold and lists to avoid conflicts)
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    return html;
}

// Initialize content data
let contentData = [];
let mainTagDefinitions = {};
let typeDefinitions = {};
let tagDefinitions = {};

// Make globally accessible
window.contentData = contentData;
window.mainTagDefinitions = mainTagDefinitions;
window.typeDefinitions = typeDefinitions;
window.tagDefinitions = tagDefinitions;
window.markdownToHtml = markdownToHtml;

// Load on page load
(async function() {
    const data = await loadContentFromMarkdown();
    contentData = data.content;
    mainTagDefinitions = data.mainTagDefinitions;
    typeDefinitions = data.typeDefinitions;
    tagDefinitions = data.tagDefinitions;
    
    // Update global references
    window.contentData = contentData;
    window.mainTagDefinitions = mainTagDefinitions;
    window.typeDefinitions = typeDefinitions;
    window.tagDefinitions = tagDefinitions;
    
    // Dispatch event when content is loaded
    window.dispatchEvent(new CustomEvent('contentLoaded', { detail: data }));
})();
