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
            } else if (trimmedLine.startsWith('Hide: ')) {
                const hideValue = trimmedLine.substring(6).trim().toLowerCase();
                currentItem.hidden = hideValue === 'true' || hideValue === 'yes';
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

// Load and parse words.md for search term suggestions
async function loadWordsFromMarkdown() {
    try {
        const response = await fetch('words.md');
        const markdown = await response.text();
        return parseWordsContent(markdown);
    } catch (error) {
        if (typeof window !== 'undefined' && window.DEBUG_LOG) window.DEBUG_LOG('Error loading words.md', error);
        return {};
    }
}

function parseWordsContent(markdown) {
    const lines = markdown.split('\n');
    const categories = {};
    let currentCategory = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Category header: ## category_fi | category_en
        if (trimmedLine.startsWith('## ')) {
            const categoryLine = trimmedLine.substring(3).trim();
            const parts = categoryLine.split('|').map(p => p.trim());
            if (parts.length === 2) {
                currentCategory = parts[0]; // Use Finnish name as key
                categories[currentCategory] = {
                    fi: parts[0],
                    en: parts[1],
                    examples: { fi: '', en: '' },
                    words: []
                };
            }
        }
        // Examples line: Examples: example_fi | example_en
        else if (trimmedLine.startsWith('Examples:') && currentCategory) {
            const examplesLine = trimmedLine.substring(9).trim();
            const parts = examplesLine.split('|').map(p => p.trim());
            if (parts.length === 2) {
                categories[currentCategory].examples = {
                    fi: parts[0],
                    en: parts[1]
                };
            }
        }
        // Word line: word_fi | word_en
        else if (trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('Examples:') && currentCategory && trimmedLine.includes('|')) {
            const parts = trimmedLine.split('|').map(p => p.trim());
            if (parts.length === 2) {
                categories[currentCategory].words.push({
                    fi: parts[0],
                    en: parts[1]
                });
            }
        }
    }
    
    return categories;
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

// Global registry for scripts that need to be executed after DOM insertion
window.customCodeBlockScripts = window.customCodeBlockScripts || {};

// Function to execute pending scripts after HTML is inserted
window.executeCustomCodeBlockScripts = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Find all elements with script data
    const scriptContainers = container.querySelectorAll('[data-script-id]');
    scriptContainers.forEach(function(el) {
        const scriptId = el.getAttribute('data-script-id');
        const scripts = window.customCodeBlockScripts[scriptId];
        if (scripts) {
            scripts.forEach(function(scriptData) {
                const script = document.createElement('script');
                if (scriptData.src) {
                    script.src = scriptData.src;
                }
                if (scriptData.async) script.async = true;
                if (scriptData.defer) script.defer = true;
                if (scriptData.content) {
                    script.textContent = scriptData.content;
                }
                el.appendChild(script);
            });
            delete window.customCodeBlockScripts[scriptId];
        }
    });
};

// Function to initialize search blocks after HTML is inserted
window.initializeSearchBlocks = function(containerId, cardData) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const searchBlocks = container.querySelectorAll('[data-search-block="true"]');
    searchBlocks.forEach(function(block) {
        // Get config from data attributes
        const customUrls = JSON.parse(decodeURIComponent(block.getAttribute('data-custom-urls') || '[]'));
        const sitesRule = block.getAttribute('data-sites-rule') || 'card';
        const freeform = block.getAttribute('data-freeform') === 'true';
        const hasCopy = block.getAttribute('data-has-copy') === 'true';
        const includeWords = block.getAttribute('data-include-words') === 'true';
        const excludeWords = block.getAttribute('data-exclude-words') === 'true';
        const excludeLinks = block.getAttribute('data-exclude-links') === 'true';
        const predefinedIncludeWords = JSON.parse(decodeURIComponent(block.getAttribute('data-inwords') || '[]'));
        const predefinedExcludeWords = JSON.parse(decodeURIComponent(block.getAttribute('data-exwords') || '[]'));
        const wordsCategories = JSON.parse(decodeURIComponent(block.getAttribute('data-words-categories') || '[]'));
        const termsCategories = JSON.parse(decodeURIComponent(block.getAttribute('data-terms-categories') || '[]'));
        
        // Collect sites based on SITES rule
        const sites = collectSitesForSearch(sitesRule, cardData);
        
        // Add custom URLs
        customUrls.forEach(url => {
            const domain = extractDomain(url);
            if (domain && !sites.some(s => s.domain === domain)) {
                sites.push({ domain: domain, name: domain });
            }
        });
        
        // Build search interface HTML
        const searchHtml = buildSearchInterface(block.id, sites, freeform, hasCopy, includeWords, excludeWords, excludeLinks, wordsCategories, termsCategories);
        
        // Insert into content div
        const contentDiv = block.querySelector('.search-block-content');
        if (contentDiv) {
            contentDiv.innerHTML = searchHtml;
            
            // Initialize event handlers
            initializeSearchHandlers(block.id, sites, freeform, includeWords, excludeWords, excludeLinks, predefinedIncludeWords, predefinedExcludeWords, wordsCategories, termsCategories);
        }
    });
};

// Helper function to collect sites based on SITES rule
function collectSitesForSearch(sitesRule, cardData) {
    const sites = [];
    
    if (!window.contentData || !Array.isArray(window.contentData)) {
        return sites;
    }
    
    switch(sitesRule) {
        case 'all':
            // Collect from all cards
            window.contentData.forEach(item => {
                extractSitesFromCard(item, sites);
            });
            break;
            
        case 'category':
            // Collect from cards with same main tag
            if (cardData && cardData.mainTag) {
                window.contentData.forEach(item => {
                    if (item.mainTag === cardData.mainTag) {
                        extractSitesFromCard(item, sites);
                    }
                });
            }
            break;
            
        case 'tag':
            // Collect from cards with overlapping tags
            if (cardData && cardData.tags) {
                const cardTags = Array.isArray(cardData.tags) ? cardData.tags : cardData.tags.split(',').map(t => t.trim());
                window.contentData.forEach(item => {
                    const itemTags = Array.isArray(item.tags) ? item.tags : (item.tags || '').split(',').map(t => t.trim());
                    if (cardTags.some(tag => itemTags.includes(tag))) {
                        extractSitesFromCard(item, sites);
                    }
                });
            }
            break;
            
        case 'keywords':
            // Collect from cards with overlapping keywords
            if (cardData && cardData.keywords) {
                const cardKeywords = cardData.keywords.split(',').map(k => k.trim().toLowerCase());
                window.contentData.forEach(item => {
                    if (item.keywords) {
                        const itemKeywords = item.keywords.split(',').map(k => k.trim().toLowerCase());
                        if (cardKeywords.some(kw => itemKeywords.includes(kw))) {
                            extractSitesFromCard(item, sites);
                        }
                    }
                });
            }
            break;
            
        case 'card':
        default:
            // Only from current card
            if (cardData) {
                extractSitesFromCard(cardData, sites);
            }
            break;
    }
    
    return sites;
}

// Helper to extract sites from a card's links
function extractSitesFromCard(card, sites) {
    if (!card.linkSections || !Array.isArray(card.linkSections)) {
        return;
    }
    
    card.linkSections.forEach(section => {
        if (section.links && Array.isArray(section.links)) {
            section.links.forEach(link => {
                if (link.url) {
                    // Handle multilingual URLs (object with fi/en) or plain strings
                    const url = typeof link.url === 'object' ? (link.url.fi || link.url.en) : link.url;
                    const domain = extractDomain(url);
                    if (domain && !sites.some(s => s.domain === domain)) {
                        // Handle multilingual names
                        const name = typeof link.name === 'object' ? (link.name.fi || link.name.en) : link.name;
                        sites.push({
                            domain: domain,
                            name: name || domain
                        });
                    }
                }
            });
        }
    });
}

// Helper to extract domain from URL
function extractDomain(url) {
    try {
        // Add protocol if missing
        const urlWithProtocol = url.startsWith('http') ? url : 'https://' + url;
        const urlObj = new URL(urlWithProtocol);
        return urlObj.hostname.replace(/^www\./, '');
    } catch (e) {
        // If it's just a domain, return as is
        return url.replace(/^www\./, '').split('/')[0];
    }
}

// Helper to collect words from categories
function collectWordsFromCategories(categories, lang) {
    if (!window.wordsData || !categories || categories.length === 0) return { words: [], examples: '' };
    
    const words = [];
    let exampleText = '';
    
    categories.forEach(categoryName => {
        const category = window.wordsData[categoryName];
        if (category) {
            // Collect example from first category that has one
            if (!exampleText && category.examples) {
                exampleText = lang === 'en' ? category.examples.en : category.examples.fi;
            }
            
            // Collect words
            if (category.words) {
                category.words.forEach(word => {
                    const text = lang === 'en' ? word.en : word.fi;
                    if (text && !words.includes(text)) {
                        words.push(text);
                    }
                });
            }
        }
    });
    
    return { words, examples: exampleText };
}

// Build search interface HTML
function buildSearchInterface(blockId, sites, freeform, hasCopy, includeWords, excludeWords, excludeLinks, wordsCategories, termsCategories) {
    const searchId = blockId + '-search';
    const engineId = blockId + '-engine';
    const sitesId = blockId + '-sites';
    const excludeSitesTagsId = blockId + '-exclude-sites-tags';
    const excludeSitesInputId = blockId + '-exclude-sites-input';
    const aiId = blockId + '-ai';
    const tagsId = blockId + '-tags';
    const freeformId = blockId + '-freeform';
    const selectAllId = blockId + '-selectall';
    const includeWordsTagsId = blockId + '-include-words-tags';
    const includeWordsInputId = blockId + '-include-words-input';
    const excludeWordsTagsId = blockId + '-exclude-words-tags';
    const excludeWordsInputId = blockId + '-exclude-words-input';
    
    // Get current language
    const currentLang = localStorage.getItem('preferredLanguage') || 'fi';
    
    // Collect words for autocomplete
    // WORDS: affects all fields, TERMS: affects only search and exclude
    const allFieldsData = collectWordsFromCategories(wordsCategories, currentLang);
    const searchExcludeData = collectWordsFromCategories(termsCategories, currentLang);
    
    const allFieldsWords = allFieldsData.words;
    const searchExcludeWords = searchExcludeData.words;
    const searchTermsWords = [...new Set([...allFieldsWords, ...searchExcludeWords])];
    const includeWordsWords = allFieldsWords;
    const excludeWordsWords = searchTermsWords;
    
    // Collect exclude links if EXLINKS is enabled
    let excludeLinksWords = [];
    if (excludeLinks && window.wordsData && window.wordsData['Links to exclude']) {
        const linksCategory = window.wordsData['Links to exclude'];
        excludeLinksWords = linksCategory.words.map(w => currentLang === 'fi' ? w.fi : w.en);
    }
    
    // Determine placeholders - prefer TERMS examples for search/exclude, WORDS examples for include
    const searchPlaceholder = searchExcludeData.examples || allFieldsData.examples || 'esim. resepti, ohje...';
    const includePlaceholder = allFieldsData.examples || 'esim. resepti';
    const excludePlaceholder = searchExcludeData.examples || allFieldsData.examples || 'esim. mainos';
    const excludeLinkPlaceholder = excludeLinks && window.wordsData && window.wordsData['Links to exclude'] 
        ? (window.wordsData['Links to exclude'].examples[currentLang] || 'esim. pinterest.com')
        : 'esim. pinterest.com';
    
    let html = '<div class="space-y-4">';
    
    // Search input
    html += '<div>';
    html += '<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Hakusanat</label>';
    html += `<input type="text" id="${searchId}" data-datalist-id="${blockId}-search-words" placeholder="${searchPlaceholder}" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">`;
    if (searchTermsWords.length > 0) {
        html += `<datalist id="${blockId}-search-words">`;
        searchTermsWords.forEach(word => {
            html += `<option value="${word}">`;
        });
        html += '</datalist>';
    }
    html += '</div>';
    
    // Search engine selector
    html += '<div>';
    html += '<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Hakukone</label>';
    html += `<select id="${engineId}" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">`;
    html += '<option value="google">Google</option>';
    html += '<option value="duckduckgo">DuckDuckGo</option>';
    html += '<option value="bing">Bing</option>';
    html += '<option value="ecosia">Ecosia</option>';
    html += '<option value="yahoo">Yahoo</option>';
    html += '<option value="qwant">Qwant</option>';
    html += '<option value="brave">Brave</option>';
    html += '</select>';
    html += '</div>';
    
    // Sites selector
    if (sites.length > 0 && !freeform) {
        html += '<div>';
        html += '<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Hae vain näiltä sivustoilta</label>';
        
        // Select all
        html += '<div class="mb-2">';
        html += `<label class="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded cursor-pointer">`;
        html += `<input type="checkbox" id="${selectAllId}" class="rounded text-blue-600">`;
        html += '<span>Valitse kaikki sivustot</span>';
        html += '</label>';
        html += '</div>';
        
        // Sites checkboxes
        html += `<div id="${sitesId}" class="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">`;
        sites.forEach(site => {
            html += `<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded cursor-pointer">`;
            html += `<input type="checkbox" value="${site.domain}" class="site-checkbox rounded text-blue-600">`;
            html += `<span title="${site.domain}">${site.name}</span>`;
            html += '</label>';
        });
        html += '</div>';
        html += '</div>';
    }
    
    // Freeform site input  
    if (freeform) {
        html += '<div>';
        html += '<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Lisää sivustoja</label>';
        html += `<div class="relative">`;
        html += `<div id="${tagsId}" class="flex flex-wrap gap-2 mb-2 empty:mb-0 empty:hidden"></div>`;
        html += `<input type="text" id="${freeformId}" data-datalist="${blockId}-datalist" placeholder="Kirjoita domain, paina Enter tai pilkku" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">`;
        
        // Datalist for autocomplete
        html += `<datalist id="${blockId}-datalist">`;
        sites.forEach(site => {
            html += `<option value="${site.domain}"></option>`;
        });
        html += '</datalist>';
        html += '</div>';
        html += '</div>';
    }
    
    // Include words (optional)
    if (includeWords) {
        html += '<div>';
        html += '<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sanat jotka PITÄÄ olla tuloksissa</label>';
        html += `<div id="${includeWordsTagsId}" class="flex flex-wrap gap-2 mb-2 empty:mb-0 empty:hidden"></div>`;
        html += `<input type="text" id="${includeWordsInputId}" data-datalist-id="${blockId}-include-words" placeholder="${includePlaceholder}" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">`;
        if (includeWordsWords.length > 0) {
            html += `<datalist id="${blockId}-include-words">`;
            includeWordsWords.forEach(word => {
                html += `<option value="${word}">`;
            });
            html += '</datalist>';
        }
        html += '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Hakutuloksissa on oltava kaikki nämä sanat (Google: "sana")</p>';
        html += '</div>';
    }
    
    // Exclude words (optional)
    if (excludeWords) {
        html += '<div>';
        html += '<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sanat joita EI saa olla tuloksissa</label>';
        html += `<div id="${excludeWordsTagsId}" class="flex flex-wrap gap-2 mb-2 empty:mb-0 empty:hidden"></div>`;
        html += `<input type="text" id="${excludeWordsInputId}" data-datalist-id="${blockId}-exclude-words" placeholder="${excludePlaceholder}" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">`;
        if (excludeWordsWords.length > 0) {
            html += `<datalist id="${blockId}-exclude-words">`;
            excludeWordsWords.forEach(word => {
                html += `<option value="${word}">`;
            });
            html += '</datalist>';
        }
        html += '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Hakutuloksissa ei saa olla näitä sanoja (Google: -sana)</p>';
        html += '</div>';
    }
    
    // Exclude sites
    html += '<div>';
    html += '<label class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sulje pois sivustot</label>';
    html += `<div id="${excludeSitesTagsId}" class="flex flex-wrap gap-2 mb-2 empty:mb-0 empty:hidden"></div>`;
    html += `<input type="text" id="${excludeSitesInputId}" ${excludeLinks && excludeLinksWords.length > 0 ? `data-datalist-id="${blockId}-exclude-links"` : ''} placeholder="${excludeLinks ? excludeLinkPlaceholder : 'Kirjoita domain, paina Enter tai pilkku'}" class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">`;
    if (excludeLinks && excludeLinksWords.length > 0) {
        html += `<datalist id="${blockId}-exclude-links">`;
        excludeLinksWords.forEach(link => {
            html += `<option value="${link}">`;
        });
        html += '</datalist>';
    }
    html += '<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Ilman https:// tai www</p>';
    html += '</div>';
    
    // Exclude AI
    html += '<div>';
    html += '<label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">';
    html += `<input type="checkbox" id="${aiId}" class="rounded text-blue-600">`;
    html += '<span>Sulje pois AI-generoidut tulokset</span>';
    html += '</label>';
    html += '</div>';
    
    // Search and Copy buttons
    html += '<div class="flex gap-2">';
    html += `<button onclick="window['executeSearch_${blockId}']()" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">`;
    html += '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>';
    html += 'Hae';
    html += '</button>';
    
    if (hasCopy) {
        html += `<button onclick="window['copySearch_${blockId}']()" class="px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-semibold rounded-lg transition-colors" title="Kopioi haku">`;
        html += '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>';
        html += '</button>';
    }
    
    html += '</div>';
    html += '</div>';
    
    return html;
}

// Initialize search block event handlers
function initializeSearchHandlers(blockId, sites, freeform, includeWords, excludeWords, excludeLinks, predefinedIncludeWords, predefinedExcludeWords, wordsCategories, termsCategories) {
    const searchId = blockId + '-search';
    const engineId = blockId + '-engine';
    const sitesId = blockId + '-sites';
    const excludeSitesTagsId = blockId + '-exclude-sites-tags';
    const excludeSitesInputId = blockId + '-exclude-sites-input';
    const aiId = blockId + '-ai';
    const tagsId = blockId + '-tags';
    const freeformId = blockId + '-freeform';
    const selectAllId = blockId + '-selectall';
    const includeWordsTagsId = blockId + '-include-words-tags';
    const includeWordsInputId = blockId + '-include-words-input';
    const excludeWordsTagsId = blockId + '-exclude-words-tags';
    const excludeWordsInputId = blockId + '-exclude-words-input';
    
    // Tag arrays
    const freeformTags = [];
    const excludeSitesTags = [];
    const includeWordsTags = [...predefinedIncludeWords];
    const excludeWordsTags = [...predefinedExcludeWords];
    
    // Helper function to add autocomplete that shows after 2+ characters
    function addAutocomplete(inputEl, excludeArray) {
        if (!inputEl) return;
        const datalistId = inputEl.getAttribute('data-datalist-id');
        if (!datalistId) return;
        const datalistEl = document.getElementById(datalistId);
        if (!datalistEl) return;
        
        // Store original options
        const originalOptions = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
        
        inputEl.addEventListener('input', function() {
            const value = this.value.trim();
            
            // Filter out already-added words from suggestions
            if (excludeArray && datalistEl) {
                datalistEl.innerHTML = '';
                originalOptions.forEach(optValue => {
                    if (!excludeArray.includes(optValue)) {
                        const option = document.createElement('option');
                        option.value = optValue;
                        datalistEl.appendChild(option);
                    }
                });
            }
            
            // Show autocomplete when 2+ characters typed
            if (value.length >= 2) {
                this.setAttribute('list', datalistId);
            } else {
                this.removeAttribute('list');
            }
        });
    }
    
    // Add autocomplete to word suggestion inputs (not search terms)
    addAutocomplete(document.getElementById(includeWordsInputId), includeWordsTags);
    addAutocomplete(document.getElementById(excludeWordsInputId), excludeWordsTags);
    addAutocomplete(document.getElementById(excludeSitesInputId), excludeSitesTags);
    
    // Add Enter key handler to search input (no autocomplete)
    const searchInput = document.getElementById(searchId);
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                window[`executeSearch_${blockId}`]();
            }
        });
    }
    
    // Select all handler
    const selectAllEl = document.getElementById(selectAllId);
    if (selectAllEl) {
        selectAllEl.addEventListener('change', function() {
            const checkboxes = document.querySelectorAll(`#${sitesId} .site-checkbox`);
            checkboxes.forEach(cb => cb.checked = this.checked);
        });
        
        // Update select all when individual boxes change
        const checkboxes = document.querySelectorAll(`#${sitesId} .site-checkbox`);
        checkboxes.forEach(cb => {
            cb.addEventListener('change', function() {
                const allChecked = Array.from(checkboxes).every(c => c.checked);
                selectAllEl.checked = allChecked;
            });
        });
    }
    
    // Freeform input handler
    if (freeform) {
        const freeformInput = document.getElementById(freeformId);
        const tagsContainer = document.getElementById(tagsId);
        const datalistId = blockId + '-datalist';
        const datalistEl = document.getElementById(datalistId);
        
        if (freeformInput && tagsContainer && datalistEl) {
            // Track last typed value to detect datalist selection
            let lastTypedValue = '';
            
            // Auto-add when datalist option selected (by click or arrow+enter)
            freeformInput.addEventListener('input', function() {
                const value = this.value.trim();
                
                // Show autocomplete only after 2+ characters
                if (value.length >= 2) {
                    this.setAttribute('list', datalistId);
                } else {
                    this.removeAttribute('list');
                }
                
                const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                
                // If value exactly matches an option and is different from what user typed
                if (value && options.includes(value) && value !== lastTypedValue) {
                    // This was a selection from datalist
                    if (!freeformTags.includes(value)) {
                        freeformTags.push(value);
                        addTag(value, tagsContainer, freeformTags);
                        this.value = '';
                        this.removeAttribute('list');
                        lastTypedValue = '';
                    }
                } else {
                    lastTypedValue = value;
                }
            });
            
            freeformInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const value = this.value.trim().replace(/,$/g, '');
                    if (value && !freeformTags.includes(value)) {
                        freeformTags.push(value);
                        addTag(value, tagsContainer, freeformTags);
                        this.value = '';
                        this.removeAttribute('list');
                        lastTypedValue = '';
                    }
                } else if (e.key === 'Tab' && this.value.trim()) {
                    const value = this.value.trim();
                    const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                    
                    // If value exactly matches an option (arrow-selected)
                    if (options.includes(value)) {
                        e.preventDefault();
                        if (!freeformTags.includes(value)) {
                            freeformTags.push(value);
                            addTag(value, tagsContainer, freeformTags);
                            this.value = '';
                            this.removeAttribute('list');
                            lastTypedValue = '';
                        }
                    }
                    // If value partially matches exactly ONE option
                    else if (options.length > 0) {
                        const matches = options.filter(opt => opt.toLowerCase().startsWith(value.toLowerCase()));
                        if (matches.length === 1) {
                            e.preventDefault();
                            if (!freeformTags.includes(matches[0])) {
                                freeformTags.push(matches[0]);
                                addTag(matches[0], tagsContainer, freeformTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        } else {
                            // No match or multiple matches - add as-is
                            e.preventDefault();
                            if (!freeformTags.includes(value)) {
                                freeformTags.push(value);
                                addTag(value, tagsContainer, freeformTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        }
                    } else {
                        // No options at all - add as-is
                        e.preventDefault();
                        if (!freeformTags.includes(value)) {
                            freeformTags.push(value);
                            addTag(value, tagsContainer, freeformTags);
                            this.value = '';
                            this.removeAttribute('list');
                            lastTypedValue = '';
                        }
                    }
                }
            });
        }
    }
    
    // Exclude sites input handler
    const excludeSitesInput = document.getElementById(excludeSitesInputId);
    const excludeSitesTagsContainer = document.getElementById(excludeSitesTagsId);
    if (excludeSitesInput && excludeSitesTagsContainer) {
        const datalistId = excludeSitesInput.getAttribute('data-datalist-id');
        const datalistEl = datalistId ? document.getElementById(datalistId) : null;
        
        // Track last typed value to detect datalist selection
        let lastTypedValue = '';
        
        // Auto-add when datalist option selected (by click or arrow+enter)
        if (datalistEl) {
            excludeSitesInput.addEventListener('input', function() {
                const value = this.value.trim();
                const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                
                // If value exactly matches an option and is different from what user typed
                if (value && options.includes(value) && value !== lastTypedValue) {
                    // This was a selection from datalist
                    if (!excludeSitesTags.includes(value)) {
                        excludeSitesTags.push(value);
                        addTag(value, excludeSitesTagsContainer, excludeSitesTags);
                        this.value = '';
                        this.removeAttribute('list');
                        lastTypedValue = '';
                    }
                } else {
                    lastTypedValue = value;
                }
            });
        }
        
        excludeSitesInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                const value = this.value.trim().replace(/,$/g, '');
                if (value && !excludeSitesTags.includes(value)) {
                    excludeSitesTags.push(value);
                    addTag(value, excludeSitesTagsContainer, excludeSitesTags);
                    this.value = '';
                    this.removeAttribute('list');
                    lastTypedValue = '';
                }
            } else if (e.key === 'Tab' && this.value.trim()) {
                const value = this.value.trim();
                
                if (datalistEl) {
                    const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                    
                    // If value exactly matches an option (arrow-selected)
                    if (options.includes(value)) {
                        e.preventDefault();
                        if (!excludeSitesTags.includes(value)) {
                            excludeSitesTags.push(value);
                            addTag(value, excludeSitesTagsContainer, excludeSitesTags);
                            this.value = '';
                            this.removeAttribute('list');
                            lastTypedValue = '';
                        }
                    }
                    // If value partially matches exactly ONE option
                    else if (options.length > 0) {
                        const matches = options.filter(opt => opt.toLowerCase().startsWith(value.toLowerCase()));
                        if (matches.length === 1) {
                            e.preventDefault();
                            if (!excludeSitesTags.includes(matches[0])) {
                                excludeSitesTags.push(matches[0]);
                                addTag(matches[0], excludeSitesTagsContainer, excludeSitesTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        } else {
                            // No match or multiple matches - add as-is
                            e.preventDefault();
                            if (!excludeSitesTags.includes(value)) {
                                excludeSitesTags.push(value);
                                addTag(value, excludeSitesTagsContainer, excludeSitesTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        }
                    } else {
                        // No options - add as-is
                        e.preventDefault();
                        if (!excludeSitesTags.includes(value)) {
                            excludeSitesTags.push(value);
                            addTag(value, excludeSitesTagsContainer, excludeSitesTags);
                            this.value = '';
                            this.removeAttribute('list');
                            lastTypedValue = '';
                        }
                    }
                } else {
                    // No datalist - add as-is
                    e.preventDefault();
                    if (!excludeSitesTags.includes(value)) {
                        excludeSitesTags.push(value);
                        addTag(value, excludeSitesTagsContainer, excludeSitesTags);
                        this.value = '';
                        lastTypedValue = '';
                    }
                }
            }
        });
    }
    
    // Include words input handler
    if (includeWords) {
        const includeWordsInput = document.getElementById(includeWordsInputId);
        const includeWordsTagsContainer = document.getElementById(includeWordsTagsId);
        if (includeWordsInput && includeWordsTagsContainer) {
            // Initialize with predefined words
            predefinedIncludeWords.forEach(word => {
                addTag(word, includeWordsTagsContainer, includeWordsTags);
            });
            
            const datalistId = includeWordsInput.getAttribute('data-datalist-id');
            const datalistEl = datalistId ? document.getElementById(datalistId) : null;
            
            // Track last typed value to detect datalist selection
            let lastTypedValue = '';
            
            // Auto-add when datalist option selected (by click or arrow+enter)
            if (datalistEl) {
                includeWordsInput.addEventListener('input', function() {
                    const value = this.value.trim();
                    const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                    
                    // If value exactly matches an option and is different from what user typed
                    if (value && options.includes(value) && value !== lastTypedValue) {
                        // This was a selection from datalist
                        if (!includeWordsTags.includes(value)) {
                            includeWordsTags.push(value);
                            addTag(value, includeWordsTagsContainer, includeWordsTags);
                            this.value = '';
                            this.removeAttribute('list');
                            lastTypedValue = '';
                        }
                    } else {
                        lastTypedValue = value;
                    }
                });
            }
            
            includeWordsInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const value = this.value.trim().replace(/,$/g, '');
                    if (value && !includeWordsTags.includes(value)) {
                        includeWordsTags.push(value);
                        addTag(value, includeWordsTagsContainer, includeWordsTags);
                        this.value = '';
                        this.removeAttribute('list');
                        lastTypedValue = '';
                    }
                } else if (e.key === 'Tab' && this.value.trim()) {
                    const value = this.value.trim();
                    
                    if (datalistEl) {
                        const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                        
                        // If value exactly matches an option (arrow-selected)
                        if (options.includes(value)) {
                            e.preventDefault();
                            if (!includeWordsTags.includes(value)) {
                                includeWordsTags.push(value);
                                addTag(value, includeWordsTagsContainer, includeWordsTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        }
                        // If value partially matches exactly ONE option
                        else if (options.length > 0) {
                            const matches = options.filter(opt => opt.toLowerCase().startsWith(value.toLowerCase()));
                            if (matches.length === 1) {
                                e.preventDefault();
                                if (!includeWordsTags.includes(matches[0])) {
                                    includeWordsTags.push(matches[0]);
                                    addTag(matches[0], includeWordsTagsContainer, includeWordsTags);
                                    this.value = '';
                                    this.removeAttribute('list');
                                    lastTypedValue = '';
                                }
                            } else {
                                // No match or multiple matches - add as-is
                                e.preventDefault();
                                if (!includeWordsTags.includes(value)) {
                                    includeWordsTags.push(value);
                                    addTag(value, includeWordsTagsContainer, includeWordsTags);
                                    this.value = '';
                                    this.removeAttribute('list');
                                    lastTypedValue = '';
                                }
                            }
                        } else {
                            // No options - add as-is
                            e.preventDefault();
                            if (!includeWordsTags.includes(value)) {
                                includeWordsTags.push(value);
                                addTag(value, includeWordsTagsContainer, includeWordsTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        }
                    } else {
                        // No datalist - add as-is
                        e.preventDefault();
                        if (!includeWordsTags.includes(value)) {
                            includeWordsTags.push(value);
                            addTag(value, includeWordsTagsContainer, includeWordsTags);
                            this.value = '';
                            lastTypedValue = '';
                        }
                    }
                }
            });
        }
    }
    
    // Exclude words input handler
    if (excludeWords) {
        const excludeWordsInput = document.getElementById(excludeWordsInputId);
        const excludeWordsTagsContainer = document.getElementById(excludeWordsTagsId);
        if (excludeWordsInput && excludeWordsTagsContainer) {
            // Initialize with predefined words
            predefinedExcludeWords.forEach(word => {
                addTag(word, excludeWordsTagsContainer, excludeWordsTags);
            });
            
            const datalistId = excludeWordsInput.getAttribute('data-datalist-id');
            const datalistEl = datalistId ? document.getElementById(datalistId) : null;
            
            // Track last typed value to detect datalist selection
            let lastTypedValue = '';
            
            // Auto-add when datalist option selected (by click or arrow+enter)
            if (datalistEl) {
                excludeWordsInput.addEventListener('input', function() {
                    const value = this.value.trim();
                    const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                    
                    // If value exactly matches an option and is different from what user typed
                    if (value && options.includes(value) && value !== lastTypedValue) {
                        // This was a selection from datalist
                        if (!excludeWordsTags.includes(value)) {
                            excludeWordsTags.push(value);
                            addTag(value, excludeWordsTagsContainer, excludeWordsTags);
                            this.value = '';
                            this.removeAttribute('list');
                            lastTypedValue = '';
                        }
                    } else {
                        lastTypedValue = value;
                    }
                });
            }
            
            excludeWordsInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const value = this.value.trim().replace(/,$/g, '');
                    if (value && !excludeWordsTags.includes(value)) {
                        excludeWordsTags.push(value);
                        addTag(value, excludeWordsTagsContainer, excludeWordsTags);
                        this.value = '';
                        this.removeAttribute('list');
                        lastTypedValue = '';
                    }
                } else if (e.key === 'Tab' && this.value.trim()) {
                    const value = this.value.trim();
                    
                    if (datalistEl) {
                        const options = Array.from(datalistEl.querySelectorAll('option')).map(opt => opt.value);
                        
                        // If value exactly matches an option (arrow-selected)
                        if (options.includes(value)) {
                            e.preventDefault();
                            if (!excludeWordsTags.includes(value)) {
                                excludeWordsTags.push(value);
                                addTag(value, excludeWordsTagsContainer, excludeWordsTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        }
                        // If value partially matches exactly ONE option
                        else if (options.length > 0) {
                            const matches = options.filter(opt => opt.toLowerCase().startsWith(value.toLowerCase()));
                            if (matches.length === 1) {
                                e.preventDefault();
                                if (!excludeWordsTags.includes(matches[0])) {
                                    excludeWordsTags.push(matches[0]);
                                    addTag(matches[0], excludeWordsTagsContainer, excludeWordsTags);
                                    this.value = '';
                                    this.removeAttribute('list');
                                    lastTypedValue = '';
                                }
                            } else {
                                // No match or multiple matches - add as-is
                                e.preventDefault();
                                if (!excludeWordsTags.includes(value)) {
                                    excludeWordsTags.push(value);
                                    addTag(value, excludeWordsTagsContainer, excludeWordsTags);
                                    this.value = '';
                                    this.removeAttribute('list');
                                    lastTypedValue = '';
                                }
                            }
                        } else {
                            // No options - add as-is
                            e.preventDefault();
                            if (!excludeWordsTags.includes(value)) {
                                excludeWordsTags.push(value);
                                addTag(value, excludeWordsTagsContainer, excludeWordsTags);
                                this.value = '';
                                this.removeAttribute('list');
                                lastTypedValue = '';
                            }
                        }
                    } else {
                        // No datalist - add as-is
                        e.preventDefault();
                        if (!excludeWordsTags.includes(value)) {
                            excludeWordsTags.push(value);
                            addTag(value, excludeWordsTagsContainer, excludeWordsTags);
                            this.value = '';
                            lastTypedValue = '';
                        }
                    }
                }
            });
        }
    }
    
    // Search function
    window[`executeSearch_${blockId}`] = function() {
        const searchTerms = document.getElementById(searchId).value.trim();
        if (!searchTerms) {
            alert('Syötä hakusanat ensin!');
            return;
        }
        
        const engine = document.getElementById(engineId).value;
        let queryParts = [];
        
        // Process search terms and include words intelligently
        const searchWords = searchTerms.split(/\s+/).filter(w => w);
        const wordsToQuote = new Set(); // Words that need quotes
        const wordsNoQuote = []; // Words without quotes
        
        searchWords.forEach(word => {
            if (includeWordsTags.includes(word)) {
                wordsToQuote.add(word); // Will be quoted
            } else {
                wordsNoQuote.push(word); // Regular search term
            }
        });
        
        // Add include words that aren't in search terms
        includeWordsTags.forEach(word => {
            if (!searchWords.includes(word)) {
                wordsToQuote.add(word);
            }
        });
        
        // Build query: unquoted words first, then quoted words
        if (wordsNoQuote.length > 0) {
            queryParts.push(wordsNoQuote.join(' '));
        }
        wordsToQuote.forEach(word => {
            queryParts.push(`"${word}"`);
        });
        
        // Collect selected sites
        const selectedSites = Array.from(document.querySelectorAll(`#${sitesId} .site-checkbox:checked`)).map(cb => cb.value);
        
        // Add freeform tags
        const allSites = [...selectedSites, ...freeformTags];
        
        if (allSites.length > 0) {
            if (engine === 'qwant') {
                queryParts.push(allSites.length === 1 ? `site:${allSites[0]}` : `site:(${allSites.join(' OR ')})`);
            } else if (engine === 'brave') {
                const limited = allSites.slice(0, 5);
                queryParts.push(limited.length === 1 ? `site:${limited[0]}` : `(${limited.map(s => `site:${s}`).join(' OR ')})`);
            } else {
                queryParts.push(allSites.length === 1 ? `site:${allSites[0]}` : `(${allSites.map(s => `site:${s}`).join(' OR ')})`);
            }
        }
        
        // Exclude words (must not be in results)
        excludeWordsTags.forEach(word => {
            queryParts.push(`-${word}`);
        });
        
        // Excluded sites
        excludeSitesTags.forEach(site => {
            queryParts.push(`-site:${site}`);
        });
        
        // AI exclusion
        if (document.getElementById(aiId).checked) {
            queryParts.push('-ai');
        }
        
        const query = queryParts.join(' ');
        const urls = {
            google: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
            duckduckgo: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            bing: `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
            ecosia: `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`,
            yahoo: `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`,
            qwant: `https://www.qwant.com/?q=${encodeURIComponent(query)}`,
            brave: `https://search.brave.com/search?q=${encodeURIComponent(query)}`
        };
        
        window.open(urls[engine] || urls.google, '_blank');
    };
    
    // Copy function
    window[`copySearch_${blockId}`] = function() {
        const searchTerms = document.getElementById(searchId).value.trim();
        if (!searchTerms) {
            alert('Ei kopioitavaa - syötä hakusanat ensin!');
            return;
        }
        
        const engine = document.getElementById(engineId).value;
        let queryParts = [];
        
        // Process search terms and include words intelligently (same as executeSearch)
        const searchWords = searchTerms.split(/\s+/).filter(w => w);
        const wordsToQuote = new Set();
        const wordsNoQuote = [];
        
        searchWords.forEach(word => {
            if (includeWordsTags.includes(word)) {
                wordsToQuote.add(word);
            } else {
                wordsNoQuote.push(word);
            }
        });
        
        includeWordsTags.forEach(word => {
            if (!searchWords.includes(word)) {
                wordsToQuote.add(word);
            }
        });
        
        if (wordsNoQuote.length > 0) {
            queryParts.push(wordsNoQuote.join(' '));
        }
        wordsToQuote.forEach(word => {
            queryParts.push(`"${word}"`);
        });
        
        const selectedSites = Array.from(document.querySelectorAll(`#${sitesId} .site-checkbox:checked`)).map(cb => cb.value);
        const allSites = [...selectedSites, ...freeformTags];
        
        if (allSites.length > 0) {
            if (engine === 'qwant') {
                queryParts.push(allSites.length === 1 ? `site:${allSites[0]}` : `site:(${allSites.join(' OR ')})`);
            } else if (engine === 'brave') {
                const limited = allSites.slice(0, 5);
                queryParts.push(limited.length === 1 ? `site:${limited[0]}` : `(${limited.map(s => `site:${s}`).join(' OR ')})`);
            } else {
                queryParts.push(allSites.length === 1 ? `site:${allSites[0]}` : `(${allSites.map(s => `site:${s}`).join(' OR ')})`);
            }
        }
        
        excludeWordsTags.forEach(word => {
            queryParts.push(`-${word}`);
        });
        
        excludeSitesTags.forEach(site => {
            queryParts.push(`-site:${site}`);
        });
        
        if (document.getElementById(aiId).checked) {
            queryParts.push('-ai');
        }
        
        const query = queryParts.join(' ');
        navigator.clipboard.writeText(query).then(() => {
            alert('Haku kopioitu leikepöydälle!');
        });
    };
}

// Helper to add a tag chip
function addTag(value, container, tagsArray) {
    const tag = document.createElement('span');
    tag.className = 'inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm';
    tag.innerHTML = `${value}<button type="button" class="hover:text-blue-600 dark:hover:text-blue-300 font-bold ml-1">×</button>`;
    
    // Remove from array when tag is removed
    tag.querySelector('button').addEventListener('click', function() {
        const index = tagsArray.indexOf(value);
        if (index > -1) tagsArray.splice(index, 1);
        tag.remove();
        // Show/hide container based on remaining tags
        if (tagsArray.length === 0) {
            container.classList.add('hidden');
        }
    });
    
    // Show container when adding tag
    container.classList.remove('hidden');
    container.appendChild(tag);
}

// Convert basic markdown to HTML
function markdownToHtml(text) {
    if (!text) return '';
    
    let html = text;
    const customCodeBlocks = [];
    
    // Process custom search blocks FIRST (before code blocks)
    // Pattern: >[!search]options Title\ncontent\n>[/search]
    html = html.replace(/^>\[!search\]([^\n]*)\n([\s\S]*?)\n>\[\/search\]$/gm, function(match, header, content) {
        // Parse header: options and title
        const headerMatch = header.match(/^([a-z+]*)\s*(.*)$/);
        const optionsStr = headerMatch ? headerMatch[1] : '';
        const title = headerMatch ? headerMatch[2].trim() : header.trim();
        const displayTitle = title || 'Haku';
        
        const options = optionsStr ? optionsStr.split('+').filter(o => o) : [];
        const hasCopy = options.includes('copy');
        const hasCollapsed = options.includes('collapsed');
        
        // Parse config from content
        const lines = content.trim().split('\n');
        let customUrls = [];
        let sitesRule = 'card'; // default
        let freeform = false;
        let includeWords = false;
        let excludeWords = false;
        let excludeLinks = false; // Enable suggestions from "Links to exclude" category
        let predefinedIncludeWords = [];
        let predefinedExcludeWords = [];
        let wordsCategories = []; // Categories for all fields
        let termsCategories = []; // Categories for search terms and exclude words only
        
        lines.forEach(line => {
            if (line.startsWith('>URLs:')) {
                const urlsStr = line.substring(6).trim();
                customUrls = urlsStr.split(',').map(u => u.trim()).filter(u => u);
            } else if (line.startsWith('>SITES:')) {
                sitesRule = line.substring(7).trim().toLowerCase();
            } else if (line.startsWith('>FREEFORM:')) {
                freeform = line.substring(10).trim().toLowerCase() === 'true';
            } else if (line.startsWith('>INCLUDE:')) {
                includeWords = line.substring(9).trim().toLowerCase() === 'true';
            } else if (line.startsWith('>EXCLUDE:')) {
                excludeWords = line.substring(9).trim().toLowerCase() === 'true';
            } else if (line.startsWith('>INWORD:')) {
                const wordsStr = line.substring(8).trim();
                predefinedIncludeWords = wordsStr.split(',').map(w => w.trim()).filter(w => w);
            } else if (line.startsWith('>EXWORD:')) {
                const wordsStr = line.substring(8).trim();
                predefinedExcludeWords = wordsStr.split(',').map(w => w.trim()).filter(w => w);
            } else if (line.startsWith('>WORDS:')) {
                const categoriesStr = line.substring(7).trim();
                wordsCategories = categoriesStr.split(',').map(c => c.trim()).filter(c => c);
            } else if (line.startsWith('>TERMS:')) {
                const categoriesStr = line.substring(7).trim();
                termsCategories = categoriesStr.split(',').map(c => c.trim()).filter(c => c);
            } else if (line.startsWith('>EXLINKS:')) {
                // EXLINKS: true means enable exclude site suggestions (uses "Links to exclude" category from words.md)
                const value = line.substring(9).trim().toLowerCase();
                excludeLinks = value === 'true';
            }
        });
        
        // Generate unique ID
        const blockId = 'search-' + Math.random().toString(36).substr(2, 9);
        
        // Build HTML with data attributes for client-side initialization
        let blockHtml = '<div class="my-4">';
        
        // Title header
        if (displayTitle) {
            blockHtml += '<div class="flex items-center justify-between mb-2">';
            blockHtml += '<div class="flex items-center gap-2">';
            if (hasCollapsed) {
                blockHtml += `<svg class="collapse-icon w-4 h-4 transition-transform${hasCollapsed ? '' : ' rotate-90'} text-gray-700 dark:text-gray-300 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" onclick="const el = document.getElementById('${blockId}'); el.classList.toggle('hidden'); this.classList.toggle('rotate-90')"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>`;
            }
            blockHtml += `<span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${displayTitle}</span>`;
            blockHtml += '</div></div>';
        }
        
        // Content area - placeholder for client-side initialization
        const bgColor = 'bg-purple-50 dark:bg-purple-900/20';
        const borderColor = 'border-purple-500';
        
        blockHtml += `<div id="${blockId}" class="${hasCollapsed ? 'hidden' : ''} border-l-4 ${borderColor} ${bgColor} rounded-lg p-4" style="pointer-events: auto;" data-search-block="true" data-custom-urls="${encodeURIComponent(JSON.stringify(customUrls))}" data-sites-rule="${sitesRule}" data-freeform="${freeform}" data-has-copy="${hasCopy}" data-include-words="${includeWords}" data-exclude-words="${excludeWords}" data-exclude-links="${excludeLinks}" data-inwords="${encodeURIComponent(JSON.stringify(predefinedIncludeWords))}" data-exwords="${encodeURIComponent(JSON.stringify(predefinedExcludeWords))}" data-words-categories="${encodeURIComponent(JSON.stringify(wordsCategories))}" data-terms-categories="${encodeURIComponent(JSON.stringify(termsCategories))}">`;
        blockHtml += `<div class="search-block-content">Loading search interface...</div>`;
        blockHtml += '</div></div>';
        
        // Store the block and return a placeholder
        const placeholder = '__CUSTOM_CODE_BLOCK_' + customCodeBlocks.length + '__';
        customCodeBlocks.push(blockHtml);
        return '\n\n' + placeholder + '\n\n';
    });
    
    // Process custom code blocks SECOND
    // Pattern: >[!code]options Title\ncontent\n>[/code]
    html = html.replace(/^>\[!code\]([^\n]*)\n([\s\S]*?)\n>\[\/code\]$/gm, function(match, header, content) {
        // Parse header: options and title
        const headerMatch = header.match(/^([a-z+]*)\s*(.*)$/);
        const optionsStr = headerMatch ? headerMatch[1] : '';
        const title = headerMatch ? headerMatch[2].trim() : header.trim();
        const displayTitle = title || 'Code';
        
        const options = optionsStr ? optionsStr.split('+').filter(o => o) : [];
        const hasBlock = options.includes('block');
        const hasCopy = options.includes('copy');
        const hasCollapsed = options.includes('collapsed');
        
        // Generate unique ID for collapse functionality
        const blockId = 'code-' + Math.random().toString(36).substr(2, 9);
        
        // Escape content for copy functionality and code display
        const rawContent = content.trim();
        const escapedContent = rawContent
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        
        // Build the HTML
        let blockHtml = '<div class="my-4">';
        
        // Title (simple, no box)
        if (displayTitle) {
            blockHtml += '<div class="flex items-center justify-between mb-2">';
            blockHtml += '<div class="flex items-center gap-2">';
            if (hasCollapsed) {
                blockHtml += `<svg class="collapse-icon w-4 h-4 transition-transform${hasCollapsed ? '' : ' rotate-90'} text-gray-700 dark:text-gray-300 cursor-pointer" fill="currentColor" viewBox="0 0 20 20" onclick="const el = document.getElementById('${blockId}'); el.classList.toggle('hidden'); this.classList.toggle('rotate-90')"><path fill-rule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clip-rule="evenodd"></path></svg>`;
            }
            blockHtml += `<span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${displayTitle}</span>`;
            blockHtml += '</div>';
            
            if (hasCopy) {
                blockHtml += `<button onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(rawContent)}')); const btn = this; btn.textContent='✓ Copied'; setTimeout(() => btn.textContent='Copy', 2000)" class="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">Copy</button>`;
            }
            
            blockHtml += '</div>';
        }
        
        // Content area with callout-style box - use colorful backgrounds
        const bgColor = hasBlock ? 'bg-indigo-900 dark:bg-indigo-950' : (hasCollapsed ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'bg-purple-50 dark:bg-purple-900/20');
        const borderColor = hasBlock ? 'border-indigo-500' : (hasCollapsed ? 'border-cyan-500' : 'border-purple-500');
        
        blockHtml += `<div id="${blockId}" class="${hasCollapsed ? 'hidden' : ''} border-l-4 ${borderColor} ${bgColor} rounded-lg p-4" style="pointer-events: auto;">`;
        
        if (hasBlock) {
            // Display as code with syntax highlighting
            blockHtml += `<pre class="overflow-x-auto text-sm"><code class="text-indigo-100">${escapedContent}</code></pre>`;
        } else {
            // Extract scripts from HTML content for proper execution
            const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
            const scripts = [];
            let scriptMatch;
            
            while ((scriptMatch = scriptRegex.exec(rawContent)) !== null) {
                const attributes = scriptMatch[1];
                const scriptContent = scriptMatch[2];
                
                // Parse script attributes
                const srcMatch = attributes.match(/src=["']([^"']+)["']/);
                scripts.push({
                    src: srcMatch ? srcMatch[1] : null,
                    async: attributes.includes('async'),
                    defer: attributes.includes('defer'),
                    content: scriptContent.trim()
                });
            }
            
            // Remove script tags from HTML
            const htmlWithoutScripts = rawContent.replace(scriptRegex, '');
            
            // If scripts exist, store them and mark container
            if (scripts.length > 0) {
                const scriptId = 'script-' + Math.random().toString(36).substr(2, 9);
                window.customCodeBlockScripts[scriptId] = scripts;
                blockHtml += `<div data-script-id="${scriptId}">${htmlWithoutScripts}</div>`;
            } else {
                blockHtml += htmlWithoutScripts;
            }
        }
        
        blockHtml += '</div></div>';
        
        // Store the block and return a placeholder
        const placeholder = '__CUSTOM_CODE_BLOCK_' + customCodeBlocks.length + '__';
        customCodeBlocks.push(blockHtml);
        return '\n\n' + placeholder + '\n\n';
    });
    
    // Handle bold **text** FIRST
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-gray-900 dark:text-white">$1</strong>');
    
    // Convert --- to a special marker that will become <hr>
    html = html.replace(/\n---\n/g, '\n\n__HORIZONTAL_RULE__\n\n');
    
    // Split by double newlines for paragraphs
    const blocks = html.split('\n\n');
    const processedBlocks = [];
    
    for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i].trim();
        if (!block) continue;
        
        // Check if this is a horizontal rule marker
        if (block === '__HORIZONTAL_RULE__') {
            processedBlocks.push('<hr class="my-6 border-gray-300 dark:border-gray-600">');
            continue;
        }
        
        // Check if this is a custom code block placeholder
        if (block.match(/^__CUSTOM_CODE_BLOCK_\d+__$/)) {
            const index = parseInt(block.match(/\d+/)[0]);
            if (customCodeBlocks[index]) {
                processedBlocks.push(customCodeBlocks[index]);
                continue;
            }
        }
        
        // Check if this is an Obsidian-style callout
        const calloutMatch = block.match(/^>\[!(info|question|note|quote|warning|tip|success|danger|error|bug|example|important)\](.*)$/im);
        if (calloutMatch) {
            const calloutType = calloutMatch[1].toLowerCase();
            const title = calloutMatch[2].trim() || (calloutType.charAt(0).toUpperCase() + calloutType.slice(1));
            
            // Extract content from lines within this block that start with >
            const calloutLines = block.split('\n');
            const contentLines = [];
            const nonCalloutLines = [];
            
            for (let j = 1; j < calloutLines.length; j++) {
                const line = calloutLines[j].trim();
                // Only include lines that start with >
                if (line.startsWith('>')) {
                    const cleanLine = line.substring(1).trim();
                    if (cleanLine) {
                        contentLines.push(cleanLine);
                    }
                } else if (line) {
                    // Collect non-callout lines to process later
                    nonCalloutLines.push(line);
                }
            }
            const content = contentLines.join('<br>');
            
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
                        <span class="text-lg flex-shrink-0 ${style.text}">${style.icon}</span>
                        <div class="flex-1">
                            <div class="font-semibold ${style.text} mb-1">${title}</div>
                            ${content ? `<div class="${style.text} opacity-90">${content}</div>` : ''}
                        </div>
                    </div>
                </div>
            `);
            
            // If there were non-callout lines in this block, process them as a new block
            if (nonCalloutLines.length > 0) {
                block = nonCalloutLines.join('\n');
                // Don't continue - let it fall through to normal processing
            } else {
                continue;
            }
        }
        
        // Split block into lines
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        
        // Separate bold-only lines from list items
        const result = [];
        let currentList = [];
        let currentListType = null; // 'numbered', 'bullet', or null
        
        for (const line of lines) {
            // Check if line is a markdown header (###, ####, #####, ######)
            const h6Match = line.match(/^######\s+(.+)$/);
            const h5Match = line.match(/^#####\s+(.+)$/);
            const h4Match = line.match(/^####\s+(.+)$/);
            const h3Match = line.match(/^###\s+(.+)$/);
            
            // Check if line is bold-only (heading)
            const isBoldOnly = line.match(/^<strong.+<\/strong>$/);
            
            // Check if line is a list item
            const isNumbered = line.match(/^\d+\.\s/);
            const isBullet = line.match(/^[-*]\s/);
            
            if (h6Match) {
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<h6 class="text-sm font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">${h6Match[1]}</h6>`);
            } else if (h5Match) {
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<h5 class="text-base font-semibold mt-4 mb-2 text-gray-800 dark:text-gray-200">${h5Match[1]}</h5>`);
            } else if (h4Match) {
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<h4 class="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white">${h4Match[1]}</h4>`);
            } else if (h3Match) {
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<h3 class="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white">${h3Match[1]}</h3>`);
            } else if (isBoldOnly) {
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<p class="text-gray-700 dark:text-gray-300">${line}</p>`);
            } else if (isNumbered) {
                if (currentListType === 'bullet' && currentList.length > 0) {
                    result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ul>`);
                    currentList = [];
                }
                currentListType = 'numbered';
                const text = line.replace(/^\d+\.\s/, '').trim();
                currentList.push(`<li class="text-gray-700 dark:text-gray-300">${text}</li>`);
            } else if (isBullet) {
                if (currentListType === 'numbered' && currentList.length > 0) {
                    result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    currentList = [];
                }
                currentListType = 'bullet';
                const text = line.replace(/^[-*]\s/, '').trim();
                currentList.push(`<li class="text-gray-700 dark:text-gray-300">${text}</li>`);
            } else {
                if (currentList.length > 0) {
                    if (currentListType === 'numbered') {
                        result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
                    } else if (currentListType === 'bullet') {
                        result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ul>`);
                    }
                    currentList = [];
                    currentListType = null;
                }
                result.push(`<p class="text-gray-700 dark:text-gray-300">${line}</p>`);
            }
        }
        
        // Flush any remaining list
        if (currentList.length > 0) {
            if (currentListType === 'numbered') {
                result.push(`<ol class="list-decimal list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ol>`);
            } else if (currentListType === 'bullet') {
                result.push(`<ul class="list-disc list-inside my-4 text-gray-700 dark:text-gray-300">${currentList.join('')}</ul>`);
            }
        }
        
        processedBlocks.push(result.join('\n'));
    }
    
    html = processedBlocks.join('\n');
    
    // Handle italic *text* (AFTER bold and lists to avoid conflicts)
    html = html.replace(/\*(.+?)\*/g, '<em class="text-gray-700 dark:text-gray-300">$1</em>');
    
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
    
    // Load roadmap
    const roadmapData = await loadRoadmapFromMarkdown();
    window.roadmapData = roadmapData;
    
    // Load words for search suggestions
    const wordsData = await loadWordsFromMarkdown();
    window.wordsData = wordsData;
    
    // Update global references
    window.contentData = contentData;
    window.mainTagDefinitions = mainTagDefinitions;
    window.typeDefinitions = typeDefinitions;
    window.tagDefinitions = tagDefinitions;
    
    // Dispatch event when content is loaded
    window.dispatchEvent(new CustomEvent('contentLoaded', { detail: data }));
})();

async function loadRoadmapFromMarkdown() {
    try {
        const response = await fetch('content-info.md');
        const markdown = await response.text();
        return parseRoadmapContent(markdown);
    } catch (error) {
        if (typeof window !== 'undefined' && window.DEBUG_LOG) window.DEBUG_LOG('Error loading content info', error);
        return { sections: [], about: { fi: '', en: '' }, feedback: { fi: '', en: '' }, userGuide: { fi: '', en: '' } };
    }
}

function parseRoadmapContent(markdown) {
    const lines = markdown.split('\n');
    const sections = [];
    let currentSection = null;
    let currentMainSection = null; // Track ## level sections (Roadmap, About, Feedback, Käyttöohjeet)
    let currentSubSection = null; // Track ### level sections (About FI, About EN, etc.)
    let aboutFi = '';
    let aboutEn = '';
    let feedbackFi = '';
    let feedbackEn = '';
    let userGuideFi = '';
    let userGuideEn = '';
    let isCollectingContent = false;
    let targetContent = null; // Which content are we collecting: 'aboutFi', 'aboutEn', 'feedbackFi', 'feedbackEn', 'userGuideFi', 'userGuideEn'
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Main section header (## Roadmap, ## About, ## Feedback, ## Käyttöohjeet)
        if (trimmedLine.startsWith('## ')) {
            const mainSectionName = trimmedLine.substring(3).trim();
            
            // Save previous roadmap section if exists
            if (currentSection && currentMainSection === 'Roadmap') {
                sections.push(currentSection);
            }
            currentSection = null;
            
            currentMainSection = mainSectionName;
            currentSubSection = null;
            isCollectingContent = false;
            continue;
        }
        
        // Subsection header (### for both Roadmap items and About/Feedback/Käyttöohjeet subsections)
        if (trimmedLine.startsWith('### ')) {
            const subSectionName = trimmedLine.substring(4).trim();
            
            // If we're in Roadmap section, this is a roadmap item
            if (currentMainSection === 'Roadmap') {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title: subSectionName,
                    status: 'planned',
                    items: []
                };
            } else {
                // Otherwise it's About FI/EN, Feedback FI/EN, or Käyttöohjeet FI/EN
                currentSubSection = subSectionName;
                isCollectingContent = false; // Wait for "Body FI" or "Body EN"
            }
            continue;
        }
        
        // Status line (for Roadmap items)
        if (trimmedLine.startsWith('Status:') && currentSection && currentMainSection === 'Roadmap') {
            currentSection.status = trimmedLine.substring(7).trim();
            continue;
        }
        
        // List item (for Roadmap items)
        if (trimmedLine.startsWith('- ') && currentSection && currentMainSection === 'Roadmap') {
            currentSection.items.push(trimmedLine.substring(2).trim());
            continue;
        }
        
        // Body FI or Body EN marker
        if (trimmedLine === 'Body FI' || trimmedLine === 'Body EN') {
            isCollectingContent = true;
            // Determine which content to collect based on current section
            if (currentMainSection === 'About' && trimmedLine === 'Body FI') {
                targetContent = 'aboutFi';
            } else if (currentMainSection === 'About' && trimmedLine === 'Body EN') {
                targetContent = 'aboutEn';
            } else if (currentMainSection === 'Feedback' && trimmedLine === 'Body FI') {
                targetContent = 'feedbackFi';
            } else if (currentMainSection === 'Feedback' && trimmedLine === 'Body EN') {
                targetContent = 'feedbackEn';
            } else if (currentMainSection === 'Käyttöohjeet' && trimmedLine === 'Body FI') {
                targetContent = 'userGuideFi';
            } else if (currentMainSection === 'Käyttöohjeet' && trimmedLine === 'Body EN') {
                targetContent = 'userGuideEn';
            }
            continue; // Don't add the "Body FI/EN" line itself
        }
        
        // Collect content after Body FI/EN marker
        if (isCollectingContent && targetContent) {
            // Add line to appropriate content variable
            if (targetContent === 'aboutFi') {
                aboutFi += line + '\n';
            } else if (targetContent === 'aboutEn') {
                aboutEn += line + '\n';
            } else if (targetContent === 'feedbackFi') {
                feedbackFi += line + '\n';
            } else if (targetContent === 'feedbackEn') {
                feedbackEn += line + '\n';
            } else if (targetContent === 'userGuideFi') {
                userGuideFi += line + '\n';
            } else if (targetContent === 'userGuideEn') {
                userGuideEn += line + '\n';
            }
        }
    }
    
    // Don't forget to push the last section if it's a roadmap item
    if (currentSection && currentMainSection === 'Roadmap') {
        sections.push(currentSection);
    }
    
    return { 
        sections, 
        about: { fi: aboutFi.trim(), en: aboutEn.trim() }, 
        feedback: { fi: feedbackFi.trim(), en: feedbackEn.trim() },
        userGuide: { fi: userGuideFi.trim(), en: userGuideEn.trim() }
    };
}
