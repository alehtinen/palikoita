// Content loader - parses content-source.md and generates contentData
// This script fetches the markdown file and converts it to the data structure

async function loadContentFromMarkdown() {
    try {
        const response = await fetch('content.md');
        const markdown = await response.text();
        
        return parseMarkdownContent(markdown);
    } catch (error) {
        console.error('Error loading content:', error);
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
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        // Check if this is a new field (starts with a known field name)
        const isNewField = trimmedLine.startsWith('###') || 
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
        
        // If we're reading a body field and encounter a new field or empty line followed by field, end body reading
        if (currentBodyField && isNewField) {
            currentBodyField = null;
        }
        
        // Continue reading body content
        if (currentBodyField && !isNewField) {
            if (!currentItem.body) currentItem.body = { fi: '', en: '' };
            if (currentItem.body[currentBodyField]) {
                currentItem.body[currentBodyField] += '\n' + line;
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
        } else if (trimmedLine === '## Content') {
            currentSection = 'content';
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
            // Format: tagId: FinnishLabel | EnglishLabel | color
            const parts = trimmedLine.split(':');
            if (parts.length === 2) {
                const tagId = parts[0].trim();
                const rest = parts[1].trim().split('|');
                if (rest.length === 3) {
                    tagDefinitions[tagId] = {
                        fi: rest[0].trim(),
                        en: rest[1].trim(),
                        color: rest[2].trim()
                    };
                }
            }
        }
        
        // Parse Content items
        if (currentSection === 'content' && trimmedLine.startsWith('###')) {
            // Save previous item if exists
            if (currentItem) {
                content.push(currentItem);
            }
            
            currentBodyField = null; // Reset body field when starting new item
            
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
            if (trimmedLine.startsWith('URL: ')) {
                currentItem.url = trimmedLine.substring(5).trim();
            } else if (trimmedLine.startsWith('Icon: ')) {
                currentItem.icon = trimmedLine.substring(6).trim();
            } else if (trimmedLine.startsWith('Type: ')) {
                currentItem.type = trimmedLine.substring(6).trim();
            } else if (trimmedLine.startsWith('Main Tag: ')) {
                currentItem.mainTag = trimmedLine.substring(10).trim();
            } else if (trimmedLine.startsWith('Tags: ')) {
                const tagList = trimmedLine.substring(6).trim();
                currentItem.tags = tagList.split(',').map(t => t.trim());
            } else if (trimmedLine.startsWith('Links: ')) {
                const linkList = trimmedLine.substring(7).trim();
                if (!currentItem.links) currentItem.links = [];
                currentItem.links = parseLinkList(linkList);
            } else if (trimmedLine.startsWith('Links FI: ')) {
                const linkList = trimmedLine.substring(10).trim();
                if (!currentItem.linksFI) currentItem.linksFI = [];
                currentItem.linksFI = parseLinkList(linkList);
            } else if (trimmedLine.startsWith('Links EN: ')) {
                const linkList = trimmedLine.substring(10).trim();
                if (!currentItem.linksEN) currentItem.linksEN = [];
                currentItem.linksEN = parseLinkList(linkList);
            } else if (trimmedLine.startsWith('Added: ')) {
                currentItem.added = trimmedLine.substring(7).trim();
            } else if (trimmedLine.startsWith('Updated: ')) {
                currentItem.updated = trimmedLine.substring(9).trim();
            } else if (trimmedLine.startsWith('Last Checked: ')) {
                currentItem.lastChecked = trimmedLine.substring(14).trim();
            } else if (trimmedLine.startsWith('Description FI: ') || trimmedLine.startsWith('Description (fi): ')) {
                currentItem.description.fi = trimmedLine.includes('(fi)') ? trimmedLine.substring(18).trim() : trimmedLine.substring(16).trim();
            } else if (trimmedLine.startsWith('Description EN: ') || trimmedLine.startsWith('Description (en): ')) {
                currentItem.description.en = trimmedLine.includes('(en)') ? trimmedLine.substring(18).trim() : trimmedLine.substring(16).trim();
            } else if (trimmedLine.startsWith('Body FI: ')) {
                if (!currentItem.body) currentItem.body = { fi: '', en: '' };
                currentItem.body.fi = trimmedLine.substring(9).trim();
                currentBodyField = 'fi'; // Start reading multi-line body
            } else if (trimmedLine.startsWith('Body EN: ')) {
                if (!currentItem.body) currentItem.body = { fi: '', en: '' };
                currentItem.body.en = trimmedLine.substring(9).trim();
                currentBodyField = 'en'; // Start reading multi-line body
            }
        }
    }
    
    // Add last item
    if (currentItem) {
        content.push(currentItem);
    }
    
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
    
    for (let block of blocks) {
        block = block.trim();
        if (!block) continue;
        
        // Split block into lines
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        
        // Separate bold-only lines from list items
        const result = [];
        let currentList = [];
        let currentListType = null; // 'numbered', 'bullet', or null
        
        for (const line of lines) {
            // Check if line is bold-only (heading)
            const isBoldOnly = line.match(/^<strong>.+<\/strong>$/);
            
            // Check if line is a list item
            const isNumbered = line.match(/^\d+\.\s/);
            const isBullet = line.match(/^[-*]\s/);
            
            if (isBoldOnly) {
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
