import md5File from 'md5-file';

export const getLocalChecksum = async (path: string) => {
    let md5;

    try {
        const stringMD5 = await md5File(path);
        md5 = Buffer.from(stringMD5, 'hex').toString('base64');
    } catch (e) {}

    return md5;
}
