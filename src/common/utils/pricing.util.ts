import { BadRequestException } from '@nestjs/common';
import { Product } from '../../modules/catalog/schemas/product.schema';

export interface SelectedOptionInput {
  groupId: string;
  choiceId: string;
}

export interface ResolvedOption {
  groupId: string;
  choiceId: string;
  name: string;
}

export function resolveLinePrice(
  product: Product,
  selectedOptions: SelectedOptionInput[] = [],
): { unitPrice: number; resolvedOptions: ResolvedOption[] } {
  let unitPrice = product.price;
  const resolvedOptions: ResolvedOption[] = [];

  const requiredGroups = product.options.filter((option) => option.required);
  for (const group of requiredGroups) {
    const picked = selectedOptions.filter(
      (selected) => selected.groupId === group.id,
    );
    if (picked.length === 0) {
      throw new BadRequestException(`Missing required option: ${group.name}`);
    }
  }

  for (const selected of selectedOptions) {
    const group = product.options.find(
      (option) => option.id === selected.groupId,
    );
    if (!group) throw new BadRequestException('Invalid option group');
    const choice = group.choices.find((c) => c.id === selected.choiceId);
    if (!choice) throw new BadRequestException('Invalid option choice');
    unitPrice += choice.priceDelta;
    resolvedOptions.push({
      groupId: group.id,
      choiceId: choice.id,
      name: choice.name,
    });
  }

  return { unitPrice, resolvedOptions };
}
