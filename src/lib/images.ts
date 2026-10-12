export type SchoolImageKind = 'logo' | 'campus';

const MAX_EDGE = { logo: 320, campus: 1400 };
const MAX_URL = { logo: 420_000, campus: 650_000 };

export function prepareSchoolImage(file: File, kind: SchoolImageKind): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
    return Promise.reject(new Error('type'));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read'));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const edge = MAX_EDGE[kind];
        const scale = Math.min(1, edge / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('read'));
          return;
        }
        if (kind === 'campus') {
          context.fillStyle = '#f3f0ea';
          context.fillRect(0, 0, canvas.width, canvas.height);
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        let url = kind === 'logo' ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.82);
        if (url.length > MAX_URL[kind]) url = canvas.toDataURL('image/jpeg', 0.7);
        if (url.length > MAX_URL[kind]) {
          reject(new Error('large'));
          return;
        }
        resolve(url);
      };
      image.onerror = () => reject(new Error('read'));
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function imageProblem(error: unknown): string {
  if (error instanceof Error && error.message === 'type') return 'Choose a PNG, JPEG, or WebP image.';
  if (error instanceof Error && error.message === 'large') return 'That image is still too large. Try a smaller photograph.';
  return 'That image could not be opened.';
}
