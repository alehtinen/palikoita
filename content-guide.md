# Content.md Formatting Guide

This guide shows all possible formatting options for content.md file.

## File Structure

```markdown
# Content Data

## Main Tags
mainTagId: Finnish Name | English Name | color | 

## Types
typeId: Finnish Name | English Name

## Tags
tagId: Finnish Name | English Name | color | icon-url (optional)

## Icons
- You can add custom icons/images to tags by adding the image URL after the color
- Example: `työ: Työ | Work | blue | https://example.com/work-icon.svg`
- Icons will be displayed next to tag names in the UI

# Content

## Category Header (Optional - organizational only, parser skips these)

### Item Title FI | Item Title EN
Type: link
Main Tag: mainTagId, mainTagId2
Tags: tag1, tag2, tag3
Icon: https://example.com/icon.svg (optional - custom icon for this item)
Short Name: Short FI | Short EN (optional - short name used in link list groupings)
Collapsed: true (optional - collapses this card's links in all link lists except category-specific popup)
URL: https://example.com (optional)
URL Name: Custom link text (optional)
URL Description: Description for the main URL (optional)
Contact: true (optional - marks main URL as contact link)
URL Contact: https://contact.example.com (optional - separate contact URL)
Description FI: Finnish description
Description EN: English description
Added: 27.01.2026 (optional)
Updated: 27.01.2026 (optional)
Last Checked: 27.01.2026 (optional)
PDF: true (optional - enables PDF download for this item)
Short Name: - A concise bilingual name used as the header when grouping links in link lists
    Format: Short Name: Short FI | Short EN
    Falls back to full title if not specified
Collapsed: - Boolean flag to collapse this card's links by default in link lists
    Format: Collapsed: true or Collapsed: yes
    Links are collapsed in all link list views EXCEPT when viewing that specific category's popup
    This helps reduce clutter for cards with many links
Keywords: word, word1, word2. Meant for helping the search, doesn't show up on the page.


**MULTIPLE BODY SECTIONS SUPPORTED:**
You can now have multiple Body FI/Body EN sections interspersed with link sections!
They will be displayed in the order they appear.

Body FI: First Finnish body content with markdown (optional)

**Bold text**

Regular paragraph.

Numbered list:
1. First item
2. Second item
3. Third item

Bullet list:
- Item one
- Item two
- Item three

#### Heading level 4
##### Heading level 5
###### Heading level 6

>[!info] Information callout title

Callout content here

>[!note] Note callout

Note content

>[!tip] Tip callout

Helpful tip

>[!quote] Quote callout

Citation text

>[!warning] Warning callout

Warning message

>[!success] Success callout

Success message

>[!danger] Danger callout

Danger warning

>[!question] Question callout

Question text

Body EN: First English body content (optional)

Same formatting options as Finnish body.

#### Links: Section Title FI | Section Title EN (flexible header level: ####, #####, or ######)
Collapsed: true = List is collapsed in the content card popup view
Short Name: Short name grouping for the all links, contacts and sources views.
- Name: Link Name FI | Link Name EN
  URL: https://example.com (optional if URL FI and URL EN exist)
  URL FI: https://fi.example.com (optional)
  URL EN: https://en.example.com (optional)
  Description: Universal description (optional)
  Description FI: Finnish description (optional)
  Description EN: English description (optional)
  Contact: true (optional - marks this link as contact)
  URL Contact: https://contact.example.com (optional - separate contact URL for this link)

- Name: Another Link
  URL: https://another.com
  Description: Another link description

Body FI: Second body section in Finnish (optional - add more text after links!)

You can continue with more content here, creating a flowing document structure.

Body EN: Second body section in English (optional)

More content in English.

##### Links: Another Section (notice ##### instead of ####)
- Name: More Links
  URL: https://example.com
  Description: Description

#### Lähteet: Lähteet | Sources (COLLAPSIBLE BY DEFAULT - for citations and references)
- Name: Source Name FI | Source Name EN
  URL: https://source.example.com (optional)
  Author: Author Name (optional)
  Date: Publication date (optional)
  Retrieved: Retrieval date DD.MM.YYYY (optional)
  Pages: Page numbers, e.g. pp. 45-67 (optional)
  Description FI: Finnish description (optional)
  Description EN: English description (optional)

- Name: Book Reference
  Author: Author Name
  Date: 2025
  Pages: pp. 123-145
  Description: Reference description

###### Links: Contact Section | Contact Information (COLLAPSIBLE BY DEFAULT - notice ######)
- Name: Contact Name
  URL: https://contact.example.com
  Description: Contact description
```

**NEW FEATURES:**
1. **Short Name**: Add a concise name for grouping in link lists (optional bilingual field)
2. **Collapsed State**: Mark cards with `Collapsed: true` to collapse their links by default in link lists
3. **Multiple Body Sections**: Add as many Body FI/Body EN sections as you need
4. **Flexible Link Header Levels**: Use ####, #####, or ###### for link sections
5. **Collapsible Sources/Contacts**: Sources (Lähteet) and contact sections are collapsed by default in modals to save space
6. **Content Order**: Body sections and link sections appear in the exact order you write them
7. **Grouped Link Lists**: All link lists now group links by content card, using Short Name (or title) as header

## Complete Example

```markdown
# Content Data

## Main Tags
työttömyys: Työttömyys | Unemployment | red | 
tampere: Tampere | Tampere | orange

## Types
link: Linkki | Link
tip: Vinkki | Tip

## Tags
työ: Työ | Work | blue | https://example.com/icons/work.svg
tampere-alue: Tampere | Tampere | red
tuki: Tuki | Support | emerald

# Content

## Työttömyys

### TE-palvelut | TE-Services
Type: link
Main Tag: työttömyys
Tags: työ, tuki
Short Name: TE | TE
Collapsed: true
Icon: https://example.com/te-services-icon.svg
URL: https://www.te-palvelut.fi/
Description FI: Työnhakijan palvelut verkossa
Description EN: Job seeker services online
Added: 27.01.2026
Last Checked: 27.01.2026
Updated: 27.01.2026
PDF: true
Hide: false
Keywords: työnhaku, työttömyys, te, työvoimatoimisto
Body FI: TE-palvelut tarjoaa kattavat palvelut työnhakijoille.

**Tärkeää:**
- Rekisteröidy työnhakijaksi
- Päivitä tietosi säännöllisesti
- Käytä työnhakupalveluita

>[!tip] Vinkki työnhakuun

Aseta hakuvahti sähköpostiin niin saat tiedon uusista työpaikoista.

#### Ohjeet

1. Kirjaudu palveluun
2. Täytä profiilisi
3. Aloita työpaikan haku

Body EN: TE-services provides comprehensive services for job seekers.

**Important:**
- Register as job seeker
- Update information regularly
- Use job search services

>[!tip] Job search tip

Set up email alerts to get notified about new job openings.

#### Instructions

1. Log in to service
2. Fill your profile
3. Start job search

#### Links: Palvelut | Services
- Name: Työnhakijalle | For jobseekers
  URL FI: https://www.te-palvelut.fi/tyonhakijalle
  URL EN: https://www.te-palvelut.fi/en/jobseekers
  Description FI: Palvelut työnhakijoille
  Description EN: Services for jobseekers

- Name: Avoimet työpaikat | Open positions
  URL: https://tyomarkkinatori.fi/
  Description: Työpaikkailmoitukset

#### Links: Yhteystiedot | Contact Information
- Name: Asiakaspalvelu | Customer Service
  URL: https://www.te-palvelut.fi/yhteystiedot
  Description: Ota yhteyttä

#### Lähteet: Lähteet | Sources
- Name: TE-palveluiden käsikirja | TE-Services Handbook
  URL: https://www.te-palvelut.fi/handbook
  Author: TE-palvelut
  Date: 2025
  Retrieved: 27.01.2026
  Pages: pp. 12-15
  Description FI: Virallinen ohjeistus työnhakijoille
  Description EN: Official guidance for job seekers

- Name: Työllisyyslaki
  Author: Eduskunta
  Date: 2024
  Pages: Luku 3, §12
```

## Field Reference

### Required Fields
- `Type:` - link or tip
- `Main Tag:` - one of the defined main tags
- `Tags:` - comma-separated list of tags
- `Description FI:` - Finnish description
- `Description EN:` - English description

### Optional Fields
- `Icon:` - URL to custom icon/image for this item
- `Short Name:` - Short FI | Short EN - Concise name for link list groupings
- `Collapsed:` - true (collapses links in link lists except category view)
- `URL:` - main link
- `URL Name:` - custom text for main link
- `URL Description:` - description for main URL
- `Contact:` - true/false (marks main URL as contact)
- `URL Contact:` - separate contact URL
- `Added:` - date in DD.MM.YYYY format
- `Updated:` - date in DD.MM.YYYY format
- `Last Checked:` - date in DD.MM.YYYY format
- `PDF:` - true (enables PDF download)
- `Hide:` - true (hides card from display - useful for work-in-progress)
- `Keywords:` - Comma-separated words for search functionality (not displayed)
- `Body FI:` - markdown content in Finnish. One content card can have more than one of these. (Look for BBREAK)
- `Body EN:` - markdown content in English. One content card can have more than one of these.
- `#### Links:` sections with links
- `#### Lähteet:` sources/citations section
- `ID:` - optional short slug/id for this content card (alphanumeric, used for shared links). If omitted, the site generates one from the title.
- `#### BBREAK:` add this between a link list and a secondary Body FI/EN part. Works as a content change indicator so that both secondary body's would show up correctly. This has to be added even on third and fourth Body EN.
- `---:` Paragraph break

Examples:
- `ID: uutissivut` (then link to this card with `index.html?card=uutissivut`)

Notes on slug normalization:
- Non-ascii letters are normalized. Finnish `ä` and `ö` are mapped to `a` and `o` respectively (e.g. `Harrastus` -> `harrastus`, `Pääkaupunki` -> `paakaupunki`).
- Use `?card=<slug>` in links to open/scroll-to a card (the site will also attempt to open the card modal automatically). If you're linking to a card inside a category page, you may want to build a URL like `category.html?category=<cat-slug>&card=<card-slug>` to preserve category context.

### Link Fields (for #### Links: sections)
- `Name:` - required, bilingual with | separator
- `URL:` - optional if URL FI and URL EN exist
- `URL FI:` - optional, Finnish-specific URL
- `URL EN:` - optional, English-specific URL
- `Description:` - optional, universal description
- `Description FI:` - optional, Finnish description
- `Description EN:` - optional, English description
- `Contact:` - optional, true marks as contact link
- `URL Contact:` - optional, separate contact URL
- `Collapsed:` true = List is collapsed in the content card popup view
- `Short Name:` Short name grouping for the all links, contacts and sources views.

### Source Fields (for #### Lähteet: sections)
- `Name:` - required, bilingual with | separator
- `URL:` - optional, link to source
- `Author:` - optional, author name
- `Date:` - optional, publication date/year
- `Retrieved:` - optional, retrieval date (DD.MM.YYYY)
- `Pages:` - optional, page numbers or section reference
- `Description:` - optional, universal description
- `Description FI:` - optional, Finnish description
- `Description EN:` - optional, English description

## Obsidian Callout Types

Available callout types:
- `>[!info]` - Blue information box
- `>[!note]` - Cyan note box
- `>[!tip]` - Green tip box
- `>[!quote]` - Gray quote box
- `>[!warning]` - Yellow warning box
- `>[!success]` - Green success box
- `>[!danger]` - Red danger box
- `>[!error]` - Red error box
- `>[!question]` - Purple question box
- `>[!bug]` - Red bug box
- `>[!example]` - Purple example box
- `>[!important]` - Orange important box

Format:
```markdown
>[!type] Title text

Content on next line after blank line
```

## Custom Code Blocks

Custom code blocks allow you to embed HTML/scripts or display code with syntax highlighting.

### Basic Syntax

**Render HTML content:**
```markdown
>[!code] Title Here
<script async src="https://example.com/widget.js"></script>
<div class="my-widget"></div>
>[/code]
```

**Display code with syntax highlighting:**
```markdown
>[!code]block Code Example
const greeting = "Hello World";
console.log(greeting);
>[/code]
```

### Options

Options are added after `>[!code]` and before the title, separated by `+`:

- `block` - Display content as code with syntax highlighting instead of rendering it
- `copy` - Add a copy button in the top-right corner
- `collapsed` - Start in collapsed state (click title to expand)

**Examples:**

Copy button only:
```markdown
>[!code]copy My Custom Widget
<div>Content here</div>
>[/code]
```

Code display with copy:
```markdown
>[!code]block+copy JavaScript Example
function hello() {
  return "Hello!";
}
>[/code]
```

All options combined:
```markdown
>[!code]block+copy+collapsed Advanced Example
// This code block starts collapsed
// and has a copy button
const result = calculate();
>[/code]
```

### Notes

- Content between `>[!code]` and `>[/code]` is NOT processed as markdown
- Without `block` option, HTML/scripts are rendered (centered in container)
- With `block` option, content is displayed as code
- Copy button copies the raw content from the markdown file

## Search Blocks

Search blocks create interactive search interfaces with site filtering, word suggestions, and multiple search engines.

### Basic Syntax

```markdown
>[!search] Search Title
>SITES: card
>FREEFORM: true
>INCLUDE: true
>EXCLUDE: true
>[/search]
```

### Options

Options are added after `>[!search]` and before the title:

- `copy` - Add a "Copy Search" button to copy query to clipboard
- `collapsed` - Start in collapsed state (click title to expand)

**Example:**
```markdown
>[!search]copy+collapsed Recipe Search
>SITES: category
>WORDS: ruoka
>[/search]
```

### Configuration Parameters

All parameters are optional and go between `>[!search]` and `>[/search]`:

#### Site Collection
- `SITES: card` - Collect sites from current card only (default)
- `SITES: category` - Collect sites from all cards in same category
- `SITES: tag` - Collect sites from all cards sharing any tags
- `SITES: keywords` - Collect sites from cards with matching keywords
- `SITES: all` - Collect sites from all cards
- `URLs: url1, url2, url3` - Add custom URLs to the list

#### Free-form Site Entry
- `FREEFORM: true` - Enable manual site entry with autocomplete from collected sites
- `FREEFORM: true++` - Show BOTH site checkboxes AND manual entry fields simultaneously

#### Word Filters
- `INCLUDE: true` - Enable "must contain" words field
- `EXCLUDE: true` - Enable "exclude" words field
- `INWORD: word1, word2` - Predefined must-contain words
- `EXWORD: word1, word2` - Predefined exclude words

#### Word Suggestions (from words.md)
- `WORDS: category1, category2` - Categories for all input fields
- `TERMS: category1, category2` - Categories for search terms and exclude words only
- `EXLINKS: true` - Enable domain suggestions for exclude sites field

### Complete Example

```markdown
>[!search]copy+collapsed Reseptihaku
>SITES: card
>FREEFORM: true
>INCLUDE: true
>EXCLUDE: true
>EXLINKS: true
>WORDS: ruoka
>TERMS: arki
>[/search]
```

This creates a search interface that:
- Starts collapsed with a copy button
- Shows sites from the current card
- Allows manual site entry
- Has must-contain and exclude word fields
- Shows domain suggestions for exclude sites
- Suggests words from "ruoka" category for all fields
- Suggests additional words from "arki" category for search terms and exclude words

### How It Works

1. **Search Engines**: Choose from Google, DuckDuckGo, Bing, Ecosia, Yahoo, Qwant, or Brave
2. **Site Filtering**: Select which sites to search (or all sites)
3. **Word Suggestions**: Type 2+ characters to see autocomplete suggestions
4. **Smart Tab Completion**:
   - Press Tab to add suggestion when only 1 match
   - Press Tab to add current text when no suggestions
   - Click suggestion to fill input, then Tab/Enter to add
5. **AI Filtering**: Checkbox to exclude AI-generated results
6. **Copy**: Copy button creates search query you can paste into search engine
7. **Open in New Tab**: Click the external link icon (⧉) next to search block title to open in standalone [search.html](search.html) page

### Standalone Search Pages

Each search block can be opened in a dedicated page for focused searching:

- **URL Format**: `search.html#card={cardId}&sid={searchId}`
- **Access**: Click the ⧉ icon next to any search block title
- **Features**: Minimal header with language/theme buttons and back button
- **Default Engine**: Navigate to `search.html` or `search.html#card=zero` to use the default search engine
- **Search Selector**: Default engine includes dropdown to switch to other search blocks

#### Creating a Default Search Engine

Create a special card with `ID: zero` to define the default search engine:

```markdown
### Hakukone | Search Engine
Type: Link
Main Tag: arki
ID: zero
Description FI: Internet-hakukoneita lisäasetuksilla
Description EN: Internet search services with extra settings
Body FI: >[!search]copy Hakukone
>SITES: all
>FREEFORM: true
>INCLUDE: true
>EXCLUDE: true
>[/search]
```

When users visit `search.html` without parameters, they'll see this default engine with a dropdown listing all available search blocks from other content cards.

### Search Query Building

The search interface intelligently builds queries:
- Regular search terms stay unquoted
- Must-contain words are added with quotes: `"word"`
- Words in both search and must-contain only appear once (quoted)
- Sites are added with `site:` operator
- Exclude words use `-` operator
- Exclude sites use `-site:` operator
- Qwant uses special OR syntax for sites

## Words.md - Search Suggestion Database

The `words.md` file provides word suggestions for search blocks. Create this file to enable autocomplete in search interfaces.

### File Format

```markdown
# Search Term Suggestions

## category_fi | category_en
Examples: example_fi | example_en
word_fi | word_en
word2_fi | word2_en
word3_fi | word3_en

## Links to exclude | Links to exclude
Examples: esim. pinterest.com | e.g. pinterest.com
domain1.com | domain1.com
domain2.fi | domain2.fi
```

### Structure

- **Category Header**: `## finnish_name | english_name`
  - Both names must be provided (can be same for non-translatable categories)
  
- **Examples Line** (optional): `Examples: finnish_example | english_example`
  - Used as placeholder text in search inputs
  - Shows users what kind of words to expect
  
- **Word Lines**: `word_fi | word_en`
  - One word per line
  - Both language versions required
  - Current language determines which version is shown

### Special Category

**Links to exclude** - Provides domain suggestions for exclude sites:
```markdown
## Links to exclude | Links to exclude
Examples: esim. pinterest.com, youtube.com... | e.g. pinterest.com, youtube.com...
pinterest.com | pinterest.com
youtube.com | youtube.com
facebook.com | facebook.com
```

### Example File

```markdown
# Search Term Suggestions

## ruoka | food
Examples: esim. resepti, ohje... | e.g. recipe, instruction...
resepti | recipe
ohje | instruction
nopea | quick
helppo | easy
vegaani | vegan

## arki | everyday
Examples: esim. nopea, helppo... | e.g. quick, easy...
nopea | quick
helppo | easy
edullinen | affordable

## Links to exclude | Links to exclude
Examples: esim. pinterest.com | e.g. pinterest.com
pinterest.com | pinterest.com
youtube.com | youtube.com
instagram.com | instagram.com
```

### Usage in Search Blocks

Reference categories in your search blocks:

```markdown
>[!search] Recipe Search
>SITES: card
>WORDS: ruoka
>TERMS: arki
>EXLINKS: true
>[/search]
```

- `WORDS: ruoka` - Shows "ruoka" words in all input fields
- `TERMS: arki` - Shows additional "arki" words in search terms and exclude words
- `EXLINKS: true` - Shows "Links to exclude" domains in exclude sites field

### Autocomplete Behavior

- Suggestions appear after typing 2+ characters
- Already-added words are filtered from suggestions
- Click suggestion or arrow-select and press Tab/Enter to add
- Type partial word + Tab = adds single match if only 1 exists
- No matches + Tab = adds typed text as-is
- Suggestions use current language (fi/en)

# Debug

The site includes an optional `debug.js` helper you can load to get advanced diagnostics. Use it only in development or on a trusted local server.

How to enable
- Temporary (one-time): append `?debug=1&persist=0` to the URL (best for single-session debugging).
- Persisted: append `?debug=1` (this sets a `debug` flag in `localStorage`). Remove with `?debug=0`.

What the panel provides
- Severity badges for **Errors**, **Warnings**, and **Info** with counts.
- Quick actions: **PARSER** (run a parser dump), **ALLLINKS** (regenerate & dump All Links), **VALID** (run All Links validator), **LOGS** (open a detailed log viewer), **EXPORT** (download logs), **CLEAR** (wipe logs).
- The log viewer is filterable by severity and supports click-to-copy for individual messages.

Useful console helpers
- `PARSER_DUMP()` — downloads `parser_dump.json` with parser rows for inspection.
- `TIME_PARSE()` — re-parses `content.md` and returns timing + parsed item counts.
- `ALLLINKS_DUMP()` — regenerates All Links and downloads `all_links.json`.
- `ALLLINKS_VALIDATE()` — runs validation checks and prints warnings/errors for suspicious entries.
- `DEBUG_DUMP()` — shows recent logs in the console.
- `DEBUG_DUMP_TO_FILE({raw:false})` — downloads sanitized logs (default). To request raw logs pass `{raw:true}` but note you must first explicitly set `window.DEBUG_ALLOW_RAW = true` in the console (only do this in a trusted environment).

Compact mode (badge-only)
- Enable from the panel: click the **Compact** button to collapse into badge-only mode (shows Errors/Warnings/Info counts).
- Console toggle: `window.DEBUG_COMPACT = 'badge'` to enable, `window.DEBUG_COMPACT = false` to disable.
- When compact:
  - The panel body is hidden and only the three severity badges remain visible.
  - Badges pulse on new entries to draw attention.
  - Click a badge to expand the panel and open the logs filtered to that severity.
  - A tiny **Compact** status indicator is shown in the panel to confirm the mode (`Compact: ON` / `Compact: OFF`).

All Links modal improvements
- Sorting: The All Links modal now supports sorting by **Default** (collected order) or **Alphabetical** (by link name). Use the **Sort** dropdown above the filter checkboxes to switch modes; the list re-renders immediately and the UI matches the main page sorting control.
- Close behavior: You can now close popups (All Links, Contacts, Tip modal, Downloads & Export modals) by clicking outside the modal content (the overlay) or by pressing **Esc**. This applies to the All Links modal, Contacts modal, and export/download dialogs as well.

Privacy & sensitive data

Privacy & sensitive data
- By default debug logs are sanitized: full URLs, long tokens, emails and bearer tokens are masked before storage and export.
- If you intentionally need full raw logs for troubleshooting, set `window.DEBUG_ALLOW_RAW = true` in the console and then call `DEBUG_DUMP_TO_FILE({raw:true})` — only do this on a secure trusted machine.

Examples
- Open the panel: load `http://localhost:8001/?debug=1&persist=0`, click **LOGS**, then filter for **Error** to inspect failures.
- Export sanitized logs: `DEBUG_DUMP_TO_FILE()`.

## Notes

- Category headers (##) are optional and organizational only
- Content items always use ### (three hashes)
- Link sections always use #### (four hashes)
- Body content supports markdown: **bold**, lists, headings (####, #####, ######)
- Emojis in link section titles are automatically removed by the parser
- Indentation matters - don't add extra spaces before #### Links:
