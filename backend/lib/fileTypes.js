const starts=(buf,bytes,offset=0)=>bytes.every((b,i)=>buf[offset+i]===b);
const ascii=(text)=>[...text].map((c)=>c.charCodeAt(0));
const Types=[
    { ext: 'png', mime: 'image/png', kind: 'image', is: (b) => starts(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { ext: 'jpg', mime: 'image/jpeg', kind: 'image', is: (b) => starts(b, [0xff, 0xd8, 0xff]) },
  { ext: 'gif', mime: 'image/gif', kind: 'image', is: (b) => starts(b, ascii('GIF87a')) || starts(b, ascii('GIF89a')) },
  { ext: 'webp', mime: 'image/webp', kind: 'image', is: (b) => starts(b, ascii('RIFF')) && starts(b, ascii('WEBP'), 8) },
  { ext: 'pdf', mime: 'application/pdf', kind: 'pdf', is: (b) => starts(b, ascii('%PDF-')) },
  {
    ext: 'docx',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    kind: 'docx',
    is: (b) => starts(b, [0x50, 0x4b, 0x03, 0x04]) && b.includes('word/document.xml'),
  },
]
export const detectType=(buffer)=>Types.find((t)=>t.is(buffer))??null;
export const ALLOWED_TEXT='PNG, JPG, GIF, WebP, PDF or Word (.docx)';