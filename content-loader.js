// Load and parse markdown content
async function loadContent() {
    console.log('loadContent called');
    try {
        const response = await fetch('content.md');
        console.log('Fetch response:', response.status);
        const markdown = await response.text();
        console.log('Markdown length:', markdown.length);
        
        // Configure marked
        marked.setOptions({
            breaks: true,
            gfm: true
        });
        
        // Parse markdown
        const sections = parseMarkdownSections(markdown);
        console.log('Parsed sections:', sections.length);
        
        // Generate navigation
        generateNavigation(sections);
        
        // Generate content
        generateContent(sections);
        
        // Initialize PDF buttons after content is loaded
        initializePDFButtons();
        
    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('content').innerHTML = '<p>Virhe sisällön lataamisessa.</p>';
    }
}

function parseMarkdownSections(markdown) {
    const sections = [];
    const lines = markdown.split('\n');
    let currentSection = null;
    let currentSubcategory = null;
    let currentSubSubcategory = null;
    let currentNestedItem = null;
    let currentNestedSubsection = null;
    let currentNestedSubSubsection = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Main heading (# Heading)
        if (trimmed.startsWith('# ')) {
            if (currentSection) {
                sections.push(currentSection);
            }
            currentSection = {
                title: trimmed.substring(2).trim(),
                id: slugify(trimmed.substring(2).trim()),
                subcategories: [],
                items: []
            };
            currentSubcategory = null;
            currentSubSubcategory = null;
            currentNestedItem = null;
            currentNestedSubsection = null;
            currentNestedSubSubsection = null;
        }
        // Subheading (## Subheading)
        else if (trimmed.startsWith('## ')) {
            if (currentSection) {
                currentSubcategory = {
                    title: trimmed.substring(3).trim(),
                    items: [],
                    subcategories: []
                };
                currentSection.subcategories.push(currentSubcategory);
                currentSubSubcategory = null;
                currentNestedItem = null;
                currentNestedSubsection = null;
                currentNestedSubSubsection = null;
            }
        }
        // Sub-subheading (### Sub-subheading)
        else if (trimmed.startsWith('### ')) {
            if (currentSubcategory) {
                currentSubSubcategory = {
                    title: trimmed.substring(4).trim(),
                    items: []
                };
                currentSubcategory.subcategories.push(currentSubSubcategory);
                currentNestedItem = null;
                currentNestedSubsection = null;
                currentNestedSubSubsection = null;
            }
        }
        // Nested subsection level 1 (>> Subsection name)
        else if (trimmed.startsWith('>> ')) {
            const subsectionText = trimmed.substring(3).trim();
            let title, description, isExpandable = false;
            
            // Check if subsection has [SUBS] marker
            let textToParse = subsectionText;
            if (textToParse.includes('[SUBS]')) {
                isExpandable = true;
                textToParse = textToParse.replace('[SUBS]', '').trim();
            }
            
            // Check if subsection has | for description
            if (textToParse.includes(' | ')) {
                const parts = textToParse.split(' | ');
                title = parts[0].trim();
                description = parts.slice(1).join(' | ').trim();
            } else {
                title = textToParse;
                description = null;
            }
            
            if (currentNestedItem) {
                currentNestedSubsection = {
                    title: title,
                    description: description,
                    isExpandable: isExpandable,
                    items: []
                };
                currentNestedItem.subsections.push(currentNestedSubsection);
                currentNestedSubSubsection = null;
            }
        }
        // Nested subsection level 2 (>>> Subsection name)
        else if (trimmed.startsWith('>>> ')) {
            const subsectionText = trimmed.substring(4).trim();
            let title, description, isExpandable = false;
            
            // Check if subsection has [SUBS] marker
            let textToParse = subsectionText;
            if (textToParse.includes('[SUBS]')) {
                isExpandable = true;
                textToParse = textToParse.replace('[SUBS]', '').trim();
            }
            
            // Check if subsection has | for description
            if (textToParse.includes(' | ')) {
                const parts = textToParse.split(' | ');
                title = parts[0].trim();
                description = parts.slice(1).join(' | ').trim();
            } else {
                title = textToParse;
                description = null;
            }
            
            if (currentNestedSubsection) {
                currentNestedSubSubsection = {
                    title: title,
                    description: description,
                    isExpandable: isExpandable,
                    items: []
                };
                currentNestedSubsection.subsections = currentNestedSubsection.subsections || [];
                currentNestedSubsection.subsections.push(currentNestedSubSubsection);
            } else if (currentNestedItem) {
                currentNestedSubsection = {
                    title: title,
                    description: description,
                    isExpandable: isExpandable,
                    items: []
                };
                currentNestedItem.subsections.push(currentNestedSubsection);
            }
        }
        // Nested subsection level 3 (>>>> Subsection name)
        else if (trimmed.startsWith('>>>> ')) {
            if (currentNestedSubSubsection) {
                // Add to level 3
                const subSubSubSection = {
                    title: trimmed.substring(5).trim(),
                    items: []
                };
                currentNestedSubSubsection.subsections = currentNestedSubSubsection.subsections || [];
                currentNestedSubSubsection.subsections.push(subSubSubSection);
            }
        }
        // Nested item under subsection (indented with spaces/tabs)
        else if (line.match(/^\s{4,}- /) && (currentNestedSubSubsection || currentNestedSubsection)) {
            const item = trimmed.substring(2).trim();
            if (currentNestedSubSubsection) {
                currentNestedSubSubsection.items.push(item);
            } else if (currentNestedSubsection) {
                currentNestedSubsection.items.push(item);
            }
        }
        // Regular list item
        else if (trimmed.startsWith('- ')) {
            const item = trimmed.substring(2).trim();
            
            // Check if item has [SUBS] marker (expandable item with subsections)
            if (item.includes('[SUBS]')) {
                const cleanItem = item.replace('[SUBS]', '').trim();
                const itemObj = {
                    content: cleanItem,
                    hasSubsections: true,
                    subsections: []
                };
                
                if (currentSubSubcategory) {
                    currentSubSubcategory.items.push(itemObj);
                } else if (currentSubcategory) {
                    currentSubcategory.items.push(itemObj);
                } else if (currentSection) {
                    currentSection.items.push(itemObj);
                }
                currentNestedItem = itemObj;
                currentNestedSubsection = null;
                currentNestedSubSubsection = null;
            } else {
                // This is a regular item at the same level, not inside a nested item
                // Reset nested tracking variables
                currentNestedItem = null;
                currentNestedSubsection = null;
                currentNestedSubSubsection = null;
                
                if (currentSubSubcategory) {
                    currentSubSubcategory.items.push(item);
                } else if (currentSubcategory) {
                    currentSubcategory.items.push(item);
                } else if (currentSection) {
                    currentSection.items.push(item);
                }
            }
        }
        // Horizontal rule (section separator)
        else if (trimmed === '---') {
            if (currentSection) {
                sections.push(currentSection);
                currentSection = null;
                currentSubcategory = null;
                currentNestedItem = null;
                currentNestedSubsection = null;
            }
        }
    }
    
    // Add last section
    if (currentSection) {
        sections.push(currentSection);
    }
    
    return sections;
}

function slugify(text) {
    const map = {
        'ä': 'a', 'ö': 'o', 'å': 'a',
        'Ä': 'A', 'Ö': 'O', 'Å': 'A'
    };
    
    return text
        .split('')
        .map(char => map[char] || char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

function shortenSubcategoryTitle(subcategoryTitle, mainTitle) {
    // Poista pääotsikon sanat alaotsikosta
    let shortened = subcategoryTitle;
    
    // Lyödään tiettyjä sanoja
    const replacements = {
        'Yleiset työpaikkaportaalit': 'Yleiset portaalit',
        'Julkisen sektorin työpaikat': 'Julkinen sektori',
        'Henkilöstöpalveluyritykset': 'Henkilöstöpalvelut'
    };
    
    if (replacements[subcategoryTitle]) {
        return replacements[subcategoryTitle];
    }
    
    return shortened;
}

function generateNavigation(sections) {
    const navLinks = document.getElementById('navLinks');
    navLinks.innerHTML = '';
    
    sections.forEach(section => {
        const li = document.createElement('li');
        
        // Check if section has subcategories
        if (section.subcategories.length > 0) {
            const a = document.createElement('a');
            a.href = `#${section.id}`;
            a.className = 'has-submenu';
            a.innerHTML = `${section.title} <span class="toggle-icon">+</span>`;
            li.appendChild(a);
            
            // Create submenu
            const submenu = document.createElement('ul');
            submenu.className = 'submenu';
            
            section.subcategories.forEach(subcategory => {
                const subLi = document.createElement('li');
                subLi.className = 'sub-item';
                const subA = document.createElement('a');
                subA.href = `#${section.id}-${slugify(subcategory.title)}`;
                subA.textContent = shortenSubcategoryTitle(subcategory.title, section.title);
                subLi.appendChild(subA);
                submenu.appendChild(subLi);
            });
            
            li.appendChild(submenu);
        } else {
            const a = document.createElement('a');
            a.href = `#${section.id}`;
            a.textContent = section.title;
            li.appendChild(a);
        }
        
        navLinks.appendChild(li);
    });
    
    // Add toggle functionality after navigation is generated
    requestAnimationFrame(() => {
        const submenuToggles = document.querySelectorAll('.has-submenu');
        
        submenuToggles.forEach(toggle => {
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.classList.toggle('active');
                const submenu = this.nextElementSibling;
                if (submenu && submenu.classList.contains('submenu')) {
                    submenu.classList.toggle('active');
                }
            });
        });
    });
}

function generateContent(sections) {
    const content = document.getElementById('content');
    content.innerHTML = '';
    
    sections.forEach(section => {
        const sectionEl = document.createElement('section');
        sectionEl.className = 'info-section';
        sectionEl.id = section.id;
        
        const h2 = document.createElement('h2');
        h2.textContent = section.title;
        sectionEl.appendChild(h2);
        
        // Add subcategories
        if (section.subcategories.length > 0) {
            section.subcategories.forEach(subcategory => {
                const h3 = document.createElement('h3');
                h3.className = 'subcategory';
                h3.id = `${section.id}-${slugify(subcategory.title)}`;
                h3.textContent = subcategory.title;
                sectionEl.appendChild(h3);
                
                // Add sub-subcategories if they exist
                if (subcategory.subcategories && subcategory.subcategories.length > 0) {
                    subcategory.subcategories.forEach(subSubcategory => {
                        const h4 = document.createElement('h4');
                        h4.className = 'sub-subcategory';
                        h4.id = `${section.id}-${slugify(subcategory.title)}-${slugify(subSubcategory.title)}`;
                        h4.textContent = subSubcategory.title;
                        sectionEl.appendChild(h4);
                        
                        const ul = document.createElement('ul');
                        ul.className = 'compact-list';
                        subSubcategory.items.forEach(item => {
                            processItem(item, ul);
                        });
                        sectionEl.appendChild(ul);
                    });
                } else {
                    // No sub-subcategories, add items directly
                    const ul = document.createElement('ul');
                    ul.className = 'compact-list';
                    subcategory.items.forEach(item => {
                        processItem(item, ul);
                    });
                    sectionEl.appendChild(ul);
                }
            });
        }
        
        // Add items without subcategory
        if (section.items.length > 0) {
            const ul = document.createElement('ul');
            ul.className = 'compact-list';
            section.items.forEach(item => {
                processItem(item, ul);
            });
            sectionEl.appendChild(ul);
        }
        
        content.appendChild(sectionEl);
    });
    
    // Add click handlers for expandable items
    requestAnimationFrame(() => {
        const expandableItems = document.querySelectorAll('.expandable-item');
        expandableItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // Don't trigger if clicking on a link or info icon
                if (e.target.tagName === 'A' || e.target.classList.contains('info-icon')) {
                    return;
                }
                this.classList.toggle('expanded');
                const nestedContent = this.querySelector('.nested-content');
                if (nestedContent) {
                    nestedContent.classList.toggle('active');
                }
            });
        });
    });
}

function processItem(item, parentUl) {
    const li = document.createElement('li');
    
    // Check if item is an object with subsections
    if (typeof item === 'object' && item.hasSubsections) {
        li.className = 'expandable-item';
        
        // Create wrapper for main content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'expandable-item-content';
        
        // Parse the main item content
        const itemContent = item.content;
        
        // Check if item has | for short|long description
        if (itemContent.includes(' | ')) {
            const parts = itemContent.split(' | ');
            const mainPart = parts[0];
            const longDesc = parts.slice(1).join(' | ').trim();
            
            // Check if mainPart also has " - " separator
            if (mainPart.includes(' - ')) {
                const subParts = mainPart.split(' - ');
                const linkPart = subParts[0];
                const shortDesc = subParts.slice(1).join(' - ').trim();
                
                contentWrapper.innerHTML = parseMarkdownLine(linkPart) + 
                    ` - ${shortDesc}` +
                    ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>` +
                    ` <span class="expand-icon">►</span>`;
            } else {
                // No " - ", just main content and long description
                contentWrapper.innerHTML = parseMarkdownLine(mainPart) +
                    ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>` +
                    ` <span class="expand-icon">►</span>`;
            }
        } else if (itemContent.includes(' - ')) {
            const parts = itemContent.split(' - ');
            const linkPart = parts[0];
            const descriptionPart = parts.slice(1).join(' - ');
            
            contentWrapper.innerHTML = parseMarkdownLine(linkPart) + 
                ` - ${descriptionPart}` +
                ` <span class="expand-icon">►</span>`;
        } else {
            contentWrapper.innerHTML = parseMarkdownLine(itemContent) + ` <span class="expand-icon">►</span>`;
        }
        
        li.appendChild(contentWrapper);
        
        // Create nested content container
        const nestedDiv = document.createElement('div');
        nestedDiv.className = 'nested-content';
        
        // Add subsections
        item.subsections.forEach(subsection => {
            // Check if subsection is expandable
            if (subsection.isExpandable) {
                // Create expandable subsection
                const expandableDiv = document.createElement('div');
                expandableDiv.className = 'expandable-subsection';
                
                const subHeader = document.createElement('h4');
                subHeader.className = 'nested-subsection-title expandable';
                subHeader.style.cursor = 'pointer';
                
                // Check if subsection has description for info icon
                if (subsection.description) {
                    subHeader.innerHTML = subsection.title + 
                        ` <span class="info-icon" data-tooltip="${subsection.description.replace(/"/g, '&quot;')}">i</span>` +
                        ` <span class="expand-icon">►</span>`;
                } else {
                    subHeader.innerHTML = subsection.title + ` <span class="expand-icon">►</span>`;
                }
                
                expandableDiv.appendChild(subHeader);
                
                // Create content container (initially hidden)
                const subsectionContent = document.createElement('div');
                subsectionContent.className = 'subsection-content';
                subsectionContent.style.display = 'none';
                
                // Add click handler
                subHeader.addEventListener('click', function(e) {
                    if (e.target.classList.contains('info-icon')) {
                        return;
                    }
                    expandableDiv.classList.toggle('expanded');
                    if (subsectionContent.style.display === 'none') {
                        subsectionContent.style.display = 'block';
                    } else {
                        subsectionContent.style.display = 'none';
                    }
                });
                
                // Process sub-subsections and items inside subsectionContent
                if (subsection.subsections && subsection.subsections.length > 0) {
                    subsection.subsections.forEach(subSubsection => {
                        // Check if sub-subsection is also expandable
                        if (subSubsection.isExpandable) {
                            // Create expandable sub-subsection
                            const expandableSubSubDiv = document.createElement('div');
                            expandableSubSubDiv.className = 'expandable-subsection';
                            expandableSubSubDiv.style.marginLeft = '15px';
                            
                            const subSubHeader = document.createElement('h5');
                            subSubHeader.className = 'nested-subsection-title expandable';
                            subSubHeader.style.fontSize = '0.9rem';
                            subSubHeader.style.cursor = 'pointer';
                            
                            if (subSubsection.description) {
                                subSubHeader.innerHTML = subSubsection.title + 
                                    ` <span class="info-icon" data-tooltip="${subSubsection.description.replace(/"/g, '&quot;')}">i</span>` +
                                    ` <span class="expand-icon">►</span>`;
                            } else {
                                subSubHeader.innerHTML = subSubsection.title + ` <span class="expand-icon">►</span>`;
                            }
                            
                            expandableSubSubDiv.appendChild(subSubHeader);
                            
                            const subSubContent = document.createElement('div');
                            subSubContent.className = 'subsection-content';
                            subSubContent.style.display = 'none';
                            subSubContent.style.marginLeft = '15px';
                            
                            // Add click handler
                            subSubHeader.addEventListener('click', function(e) {
                                if (e.target.classList.contains('info-icon')) {
                                    return;
                                }
                                expandableSubSubDiv.classList.toggle('expanded');
                                if (subSubContent.style.display === 'none') {
                                    subSubContent.style.display = 'block';
                                } else {
                                    subSubContent.style.display = 'none';
                                }
                            });
                            
                            // Add sub-subsection items to subSubContent
                            const subSubUl = document.createElement('ul');
                            subSubUl.className = 'nested-list';
                            
                            subSubsection.items.forEach(subSubItem => {
                                const subSubLi = document.createElement('li');
                                
                                if (subSubItem.includes(' - ')) {
                                    const parts = subSubItem.split(' - ');
                                    const linkPart = parts[0];
                                    const descriptionPart = parts.slice(1).join(' - ');
                                    
                                    let shortDesc, longDesc;
                                    if (descriptionPart.includes(' | ')) {
                                        const descParts = descriptionPart.split(' | ');
                                        shortDesc = descParts[0].trim();
                                        longDesc = descParts.slice(1).join(' | ').trim();
                                    } else {
                                        shortDesc = descriptionPart;
                                        longDesc = descriptionPart;
                                    }
                                    
                                    subSubLi.innerHTML = parseMarkdownLine(linkPart) + 
                                        ` - ${shortDesc}` +
                                        ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>`;
                                } else {
                                    subSubLi.innerHTML = parseMarkdownLine(subSubItem);
                                }
                                
                                subSubUl.appendChild(subSubLi);
                            });
                            subSubContent.appendChild(subSubUl);
                            expandableSubSubDiv.appendChild(subSubContent);
                            subsectionContent.appendChild(expandableSubSubDiv);
                        } else {
                            // Non-expandable sub-subsection (original rendering)
                            const subSubHeader = document.createElement('h5');
                            subSubHeader.className = 'nested-subsection-title';
                            subSubHeader.style.marginLeft = '15px';
                            subSubHeader.style.fontSize = '0.9rem';
                            
                            if (subSubsection.description) {
                                subSubHeader.innerHTML = subSubsection.title + 
                                    ` <span class="info-icon" data-tooltip="${subSubsection.description.replace(/"/g, '&quot;')}">i</span>`;
                            } else {
                                subSubHeader.textContent = subSubsection.title;
                            }
                            
                            subsectionContent.appendChild(subSubHeader);
                            
                            const subSubUl = document.createElement('ul');
                            subSubUl.className = 'nested-list';
                            subSubUl.style.marginLeft = '15px';
                            
                            subSubsection.items.forEach(subSubItem => {
                                const subSubLi = document.createElement('li');
                                
                                if (subSubItem.includes(' - ')) {
                                    const parts = subSubItem.split(' - ');
                                    const linkPart = parts[0];
                                    const descriptionPart = parts.slice(1).join(' - ');
                                    
                                    let shortDesc, longDesc;
                                    if (descriptionPart.includes(' | ')) {
                                        const descParts = descriptionPart.split(' | ');
                                        shortDesc = descParts[0].trim();
                                        longDesc = descParts.slice(1).join(' | ').trim();
                                    } else {
                                        shortDesc = descriptionPart;
                                        longDesc = descriptionPart;
                                    }
                                    
                                    subSubLi.innerHTML = parseMarkdownLine(linkPart) + 
                                        ` - ${shortDesc}` +
                                        ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>`;
                                } else {
                                    subSubLi.innerHTML = parseMarkdownLine(subSubItem);
                                }
                                
                                subSubUl.appendChild(subSubLi);
                            });
                            subsectionContent.appendChild(subSubUl);
                        }
                    });
                }
                
                // Render subsection items (if any)
                if (subsection.items && subsection.items.length > 0) {
                    const subUl = document.createElement('ul');
                    subUl.className = 'nested-list';
                    
                    subsection.items.forEach(subItem => {
                        const subLi = document.createElement('li');
                        
                        if (subItem.includes(' - ')) {
                            const parts = subItem.split(' - ');
                            const linkPart = parts[0];
                            const descriptionPart = parts.slice(1).join(' - ');
                            
                            let shortDesc, longDesc;
                            if (descriptionPart.includes(' | ')) {
                                const descParts = descriptionPart.split(' | ');
                                shortDesc = descParts[0].trim();
                                longDesc = descParts.slice(1).join(' | ').trim();
                            } else {
                                shortDesc = descriptionPart;
                                longDesc = descriptionPart;
                            }
                            
                            subLi.innerHTML = parseMarkdownLine(linkPart) + 
                                ` - ${shortDesc}` +
                                ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>`;
                        } else {
                            subLi.innerHTML = parseMarkdownLine(subItem);
                        }
                        
                        subUl.appendChild(subLi);
                    });
                    subsectionContent.appendChild(subUl);
                }
                
                expandableDiv.appendChild(subsectionContent);
                nestedDiv.appendChild(expandableDiv);
            } else {
                // Non-expandable subsection (original rendering)
                const subHeader = document.createElement('h4');
                subHeader.className = 'nested-subsection-title';
                
                // Check if subsection has description for info icon
                if (subsection.description) {
                    subHeader.innerHTML = subsection.title + 
                        ` <span class="info-icon" data-tooltip="${subsection.description.replace(/"/g, '&quot;')}">i</span>`;
                } else {
                    subHeader.textContent = subsection.title;
                }
                
                nestedDiv.appendChild(subHeader);
            
                // Check if subsection has sub-subsections (>>> level)
                if (subsection.subsections && subsection.subsections.length > 0) {
                    subsection.subsections.forEach(subSubsection => {
                        const subSubHeader = document.createElement('h5');
                        subSubHeader.className = 'nested-subsection-title';
                        subSubHeader.style.marginLeft = '15px';
                        subSubHeader.style.fontSize = '0.9rem';
                        
                        // Check if sub-subsection has description
                        if (subSubsection.description) {
                            subSubHeader.innerHTML = subSubsection.title + 
                                ` <span class="info-icon" data-tooltip="${subSubsection.description.replace(/"/g, '&quot;')}">i</span>`;
                        } else {
                            subSubHeader.textContent = subSubsection.title;
                        }
                        
                        nestedDiv.appendChild(subSubHeader);
                        
                        const subSubUl = document.createElement('ul');
                        subSubUl.className = 'nested-list';
                        subSubUl.style.marginLeft = '15px';
                        
                        subSubsection.items.forEach(subSubItem => {
                            const subSubLi = document.createElement('li');
                            
                            if (subSubItem.includes(' - ')) {
                                const parts = subSubItem.split(' - ');
                                const linkPart = parts[0];
                                const descriptionPart = parts.slice(1).join(' - ');
                                
                                let shortDesc, longDesc;
                                if (descriptionPart.includes(' | ')) {
                                    const descParts = descriptionPart.split(' | ');
                                    shortDesc = descParts[0].trim();
                                    longDesc = descParts.slice(1).join(' | ').trim();
                                } else {
                                    shortDesc = descriptionPart;
                                    longDesc = descriptionPart;
                                }
                                
                                subSubLi.innerHTML = parseMarkdownLine(linkPart) + 
                                    ` - ${shortDesc}` +
                                    ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>`;
                            } else {
                                subSubLi.innerHTML = parseMarkdownLine(subSubItem);
                            }
                            
                            subSubUl.appendChild(subSubLi);
                        });
                        nestedDiv.appendChild(subSubUl);
                    });
                }
                
                // Render subsection items (if any)
                if (subsection.items && subsection.items.length > 0) {
                    const subUl = document.createElement('ul');
                    subUl.className = 'nested-list';
                    subsection.items.forEach(subItem => {
                        const subLi = document.createElement('li');
                        
                        if (subItem.includes(' - ')) {
                            const parts = subItem.split(' - ');
                            const linkPart = parts[0];
                            const descriptionPart = parts.slice(1).join(' - ');
                            
                            let shortDesc, longDesc;
                            if (descriptionPart.includes(' | ')) {
                                const descParts = descriptionPart.split(' | ');
                                shortDesc = descParts[0].trim();
                                longDesc = descParts.slice(1).join(' | ').trim();
                            } else {
                                shortDesc = descriptionPart;
                                longDesc = descriptionPart;
                            }
                            
                            subLi.innerHTML = parseMarkdownLine(linkPart) + 
                                ` - ${shortDesc}` +
                                ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>`;
                        } else {
                            subLi.innerHTML = parseMarkdownLine(subItem);
                        }
                        
                        subUl.appendChild(subLi);
                    });
                    nestedDiv.appendChild(subUl);
                }
            }
        });
        
        li.appendChild(nestedDiv);
        parentUl.appendChild(li);
    } else {
        // Regular item without subsections
        const itemText = typeof item === 'string' ? item : item.content;
        
        if (itemText.includes(' - ')) {
            const parts = itemText.split(' - ');
            const linkPart = parts[0];
            const descriptionPart = parts.slice(1).join(' - ');
            
            let shortDesc, longDesc;
            if (descriptionPart.includes(' | ')) {
                const descParts = descriptionPart.split(' | ');
                shortDesc = descParts[0].trim();
                longDesc = descParts.slice(1).join(' | ').trim();
            } else {
                shortDesc = descriptionPart;
                longDesc = descriptionPart;
            }
            
            li.innerHTML = parseMarkdownLine(linkPart) + 
                ` - ${shortDesc}` +
                ` <span class="info-icon" data-tooltip="${longDesc.replace(/"/g, '&quot;')}">i</span>`;
        } else {
            li.innerHTML = parseMarkdownLine(itemText);
        }
        
        parentUl.appendChild(li);
    }
}

function parseMarkdownLine(text) {
    // Parse [text](url) links
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
}

function initializePDFButtons() {
    console.log('initializePDFButtons called');
    const shortButton = document.getElementById('downloadPdfShort');
    const fullButton = document.getElementById('downloadPdfFull');
    
    console.log('Short button:', shortButton);
    console.log('Full button:', fullButton);
    console.log('generatePDF function exists:', typeof generatePDF !== 'undefined');
    
    if (shortButton) {
        shortButton.addEventListener('click', () => {
            console.log('Short PDF button clicked');
            generatePDF(false);
        });
    }
    
    if (fullButton) {
        fullButton.addEventListener('click', () => {
            console.log('Full PDF button clicked');
            generatePDF(true);
        });
    }
}

// Load content when page loads
document.addEventListener('DOMContentLoaded', loadContent);
