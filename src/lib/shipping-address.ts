export type ShippingAddressFields = {
  recipientName?: string;
  cep?: string;
  city?: string;
  state?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  fulfillmentType?: string;
};

export function parseShippingAddressJson(raw: string): ShippingAddressFields | null {
  try {
    return JSON.parse(raw) as ShippingAddressFields;
  } catch {
    return null;
  }
}

export function formatShippingAddressLines(
  address: ShippingAddressFields | null,
): string[] {
  if (!address) {
    return [];
  }

  const lines: string[] = [];
  const streetLine = [address.street, address.number].filter(Boolean).join(", ");

  if (streetLine) {
    lines.push(streetLine);
  }
  if (address.complement?.trim()) {
    lines.push(address.complement.trim());
  }
  if (address.neighborhood?.trim()) {
    lines.push(address.neighborhood.trim());
  }

  const cityLine = [address.city, address.state].filter(Boolean).join(" - ");
  if (cityLine) {
    lines.push(cityLine);
  }
  if (address.cep?.trim()) {
    lines.push(`CEP ${address.cep.trim()}`);
  }

  return lines;
}

export function formatShippingAddressFromRaw(raw: string): string[] {
  return formatShippingAddressLines(parseShippingAddressJson(raw));
}
