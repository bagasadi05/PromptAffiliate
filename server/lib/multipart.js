export async function parseMultipartData(request) {
    const parts = request.parts();
    const files = [];
    const fields = {};
    const jsonFieldNames = new Set(['preset', 'options', 'imageReferences', 'preferenceMemory']);

    for await (const part of parts) {
        if (part.type === 'file') {
            const buffer = await part.toBuffer();
            // Only keep actual non-empty files
            if (buffer.length > 0) {
                files.push({
                    data: buffer,
                    base64: buffer.toString('base64'),
                    mimetype: part.mimetype,
                    filename: part.filename,
                });
            }
        } else {
            // parse known JSON fields automatically, or keep string
            try {
                if (jsonFieldNames.has(part.fieldname)) {
                    fields[part.fieldname] = JSON.parse(part.value);
                } else {
                    fields[part.fieldname] = part.value;
                }
            } catch {
                fields[part.fieldname] = part.value;
            }
        }
    }

    return { files, fields };
}
