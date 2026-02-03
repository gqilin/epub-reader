# Metadata Extraction

Learn how to extract and work with EPUB metadata using EPUB Reader Core.

## Available Metadata Fields

EPUB Reader Core extracts comprehensive metadata from EPUB files:

```typescript
interface EpubMetadata {
  title?: string;        // Book title
  creator?: string;      // Author or creator
  description?: string;  // Book description
  language?: string;     // Language code (e.g., "en", "zh")
  publisher?: string;    // Publisher name
  identifier?: string;   // Unique identifier (ISBN, UUID, etc.)
  date?: string;         // Publication date
  rights?: string;       // Copyright information
  cover?: string;        // Cover image ID reference
}
```

## Basic Metadata Access

### Getting All Metadata

```typescript
import { EpubReader } from 'epub-reader-core';

const reader = new EpubReader();
await reader.load(epubFile);

const metadata = reader.getMetadata();

if (metadata) {
  console.log('Book Metadata:');
  console.log('Title:', metadata.title);
  console.log('Author:', metadata.creator);
  console.log('Description:', metadata.description);
}
```

### Checking for Specific Fields

Always check if metadata fields exist before using them:

```typescript
const metadata = reader.getMetadata();

if (metadata?.title) {
  console.log('Book title:', metadata.title);
} else {
  console.log('No title found');
}

if (metadata?.creator) {
  console.log('Author:', metadata.creator);
} else {
  console.log('No author information');
}
```

## Displaying Metadata

### Format Book Information

```typescript
function formatBookInfo(metadata: EpubMetadata | null): string {
  if (!metadata) return 'No metadata available';
  
  const parts = [];
  
  if (metadata.title) parts.push(`**${metadata.title}**`);
  if (metadata.creator) parts.push(`by ${metadata.creator}`);
  if (metadata.publisher) parts.push(`Published by ${metadata.publisher}`);
  if (metadata.date) parts.push(`(${metadata.date})`);
  
  return parts.join(' ');
}

// Usage
const bookInfo = formatBookInfo(reader.getMetadata());
console.log(bookInfo);
```

### Create Book Card UI

```typescript
function createBookCard(metadata: EpubMetadata | null) {
  if (!metadata) return null;
  
  return {
    title: metadata.title || 'Unknown Title',
    author: metadata.creator || 'Unknown Author',
    description: metadata.description || 'No description available',
    language: metadata.language || 'Unknown',
    publisher: metadata.publisher || 'Unknown Publisher',
    date: metadata.date || 'Unknown Date'
  };
}

// Usage in a component
const bookCard = createBookCard(reader.getMetadata());
```

## Language Handling

### Language Codes

EPUB files use ISO 639-1 language codes. Here's how to handle them:

```typescript
function getLanguageName(code: string): string {
  const languages: Record<string, string> = {
    'en': 'English',
    'zh': 'Chinese',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ru': 'Russian',
    'pt': 'Portuguese',
    'it': 'Italian'
  };
  
  return languages[code] || code;
}

const metadata = reader.getMetadata();
if (metadata?.language) {
  const languageName = getLanguageName(metadata.language);
  console.log(`Language: ${languageName} (${metadata.language})`);
}
```

### RTL Language Support

Handle right-to-left languages:

```typescript
function isRTL(languageCode: string): boolean {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur', 'yi'];
  return rtlLanguages.includes(languageCode);
}

const metadata = reader.getMetadata();
if (metadata?.language && isRTL(metadata.language)) {
  // Apply RTL styling
  document.body.dir = 'rtl';
}
```

## Date Formatting

### Parse Publication Dates

```typescript
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    return dateString; // Return original if parsing fails
  }
}

const metadata = reader.getMetadata();
if (metadata?.date) {
  console.log('Published:', formatDate(metadata.date));
}
```

## Identifier Handling

### ISBN and UUIDs

EPUB files may contain various types of identifiers:

```typescript
function parseIdentifier(identifier: string): { type: string; value: string } | null {
  if (!identifier) return null;
  
  // Check for ISBN-13
  if (identifier.match(/^97[89]\d{10}$/)) {
    return { type: 'ISBN-13', value: identifier };
  }
  
  // Check for ISBN-10
  if (identifier.match(/^\d{9}[\dX]$/)) {
    return { type: 'ISBN-10', value: identifier };
  }
  
  // Check for UUID
  if (identifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return { type: 'UUID', value: identifier };
  }
  
  return { type: 'Other', value: identifier };
}

const metadata = reader.getMetadata();
if (metadata?.identifier) {
  const parsed = parseIdentifier(metadata.identifier);
  if (parsed) {
    console.log(`${parsed.type}: ${parsed.value}`);
  }
}
```

## Missing Data Handling

### Fallback Values

Provide sensible defaults when metadata is missing:

```typescript
function getBookMetadata(metadata: EpubMetadata | null) {
  return {
    title: metadata?.title || 'Untitled Book',
    author: metadata?.creator || 'Anonymous',
    description: metadata?.description || 'No description available.',
    publisher: metadata?.publisher || 'Unknown Publisher',
    language: metadata?.language || 'Unknown',
    date: metadata?.date ? formatDate(metadata.date) : 'Unknown Date',
    rights: metadata?.rights || 'No rights information available.'
  };
}
```

### Progressive Enhancement

Load and display metadata as it becomes available:

```typescript
async function loadMetadataProgressively(reader: EpubReader) {
  const metadata = reader.getMetadata();
  
  // Immediately display title if available
  if (metadata?.title) {
    updateTitle(metadata.title);
  }
  
  // Display other fields
  if (metadata?.creator) updateAuthor(metadata.creator);
  if (metadata?.description) updateDescription(metadata.description);
  if (metadata?.publisher) updatePublisher(metadata.publisher);
  
  // Load cover image asynchronously
  if (metadata?.cover) {
    const coverImage = await reader.getCoverImage();
    if (coverImage) {
      updateCover(coverImage);
    }
  }
}
```

## Metadata Validation

### Validate Required Fields

```typescript
function validateMetadata(metadata: EpubMetadata | null): {
  isValid: boolean;
  missingFields: string[];
} {
  if (!metadata) {
    return { isValid: false, missingFields: ['All metadata'] };
  }
  
  const requiredFields = ['title', 'creator'];
  const missingFields = requiredFields.filter(field => !metadata[field as keyof EpubMetadata]);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

const validation = validateMetadata(reader.getMetadata());
if (!validation.isValid) {
  console.warn('Missing required metadata:', validation.missingFields.join(', '));
}
```

## Search and Filtering

### Search by Metadata

```typescript
function matchesSearch(metadata: EpubMetadata | null, searchTerm: string): boolean {
  if (!metadata || !searchTerm) return false;
  
  const searchLower = searchTerm.toLowerCase();
  
  return [
    metadata.title,
    metadata.creator,
    metadata.description,
    metadata.publisher
  ].some(field => field?.toLowerCase().includes(searchLower));
}

// Usage
const bookLibrary: EpubReader[] = [];
const searchResults = bookLibrary.filter(reader => 
  matchesSearch(reader.getMetadata(), 'javascript')
);
```

## Complete Metadata Example

```typescript
import { EpubReader, EpubMetadata } from 'epub-reader-core';

class BookMetadataManager {
  private reader: EpubReader;
  
  constructor(reader: EpubReader) {
    this.reader = reader;
  }
  
  getFormattedMetadata(): FormattedBookMetadata {
    const metadata = this.reader.getMetadata();
    
    return {
      displayTitle: this.getDisplayTitle(metadata),
      displayAuthor: this.getDisplayAuthor(metadata),
      fullDescription: this.getFullDescription(metadata),
      publicationInfo: this.getPublicationInfo(metadata),
      identifiers: this.getIdentifiers(metadata),
      languageInfo: this.getLanguageInfo(metadata),
      rightsInfo: this.getRightsInfo(metadata)
    };
  }
  
  private getDisplayTitle(metadata: EpubMetadata | null): string {
    return metadata?.title || 'Untitled Book';
  }
  
  private getDisplayAuthor(metadata: EpubMetadata | null): string {
    return metadata?.creator || 'Unknown Author';
  }
  
  private getFullDescription(metadata: EpubMetadata | null): string {
    return metadata?.description || 'No description available.';
  }
  
  private getPublicationInfo(metadata: EpubMetadata | null): string {
    const parts = [];
    if (metadata?.publisher) parts.push(metadata.publisher);
    if (metadata?.date) parts.push(formatDate(metadata.date));
    return parts.join(', ') || 'Unknown Publication Info';
  }
  
  private getIdentifiers(metadata: EpubMetadata | null): Array<{type: string; value: string}> {
    if (!metadata?.identifier) return [];
    
    const parsed = parseIdentifier(metadata.identifier);
    return parsed ? [parsed] : [];
  }
  
  private getLanguageInfo(metadata: EpubMetadata | null): string {
    if (!metadata?.language) return 'Unknown Language';
    
    const languageName = getLanguageName(metadata.language);
    return `${languageName} (${metadata.language})`;
  }
  
  private getRightsInfo(metadata: EpubMetadata | null): string {
    return metadata?.rights || 'No rights information available.';
  }
}

interface FormattedBookMetadata {
  displayTitle: string;
  displayAuthor: string;
  fullDescription: string;
  publicationInfo: string;
  identifiers: Array<{type: string; value: string}>;
  languageInfo: string;
  rightsInfo: string;
}

// Usage
const manager = new BookMetadataManager(reader);
const formatted = manager.getFormattedMetadata();
console.log(`Reading: ${formatted.displayTitle} by ${formatted.displayAuthor}`);
```

## Next Steps

Now that you understand metadata extraction:

- [Reading Chapters](/guide/chapters) - Learn how to access chapter content
- [Table of Contents](/guide/table-of-contents) - Navigate through book structure
- [Resources & Images](/guide/resources) - Work with embedded assets