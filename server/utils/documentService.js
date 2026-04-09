const fs = require('fs');
const mammoth = require('mammoth');

// Parse TEXT file
async function parseTxtFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log('TXT file parsed successfully');
    return content;
  } catch (error) {
    console.error('Error parsing TXT file:', error.message);
    throw new Error(`Failed to parse TXT file: ${error.message}`);
  }
}

// Parse DOCX file
async function parseDocxFile(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    console.log('DOCX file parsed successfully');
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX file:', error.message);
    throw new Error(`Failed to parse DOCX file: ${error.message}`);
  }
}

// Parse document based on file type
async function parseDocument(filePath, mimeType) {
  if (mimeType === 'text/plain') {
    return await parseTxtFile(filePath);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await parseDocxFile(filePath);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}

module.exports = {
  parseDocument,
  parseTxtFile,
  parseDocxFile
};
