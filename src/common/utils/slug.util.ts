import slugify from 'slugify';
import { Model } from 'mongoose';

export async function generateUniqueSlug(
  model: Model<any>,
  base: string,
  filter: Record<string, any> = {},
): Promise<string> {
  const baseSlug = slugify(base, { lower: true, strict: true });
  let slug = baseSlug;
  let suffix = 1;
  while (await model.exists({ ...filter, slug })) {
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }
  return slug;
}
