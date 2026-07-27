export type OrganizationLetterhead = {
  name: string;
  industry: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  kvkNumber: string | null;
  vatNumber: string | null;
  iban: string | null;
};

export const ORGANIZATION_LETTERHEAD_SELECT =
  "id, name, slug, industry, address, postal_code, city, country, phone, email, kvk_number, vat_number, iban, updated_at";

export function mapOrganizationLetterhead(row: {
  name: string;
  industry: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  iban: string | null;
}): OrganizationLetterhead {
  return {
    name: row.name,
    industry: row.industry,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    country: row.country,
    phone: row.phone,
    email: row.email,
    kvkNumber: row.kvk_number,
    vatNumber: row.vat_number,
    iban: row.iban,
  };
}

export function formatLetterheadAddressLines(
  org: Pick<
    OrganizationLetterhead,
    "address" | "postalCode" | "city" | "country"
  >,
): string[] {
  const lines: string[] = [];
  if (org.address?.trim()) lines.push(org.address.trim());
  const cityLine = [org.postalCode?.trim(), org.city?.trim()]
    .filter(Boolean)
    .join(" ");
  if (cityLine) lines.push(cityLine);
  if (org.country?.trim()) lines.push(org.country.trim());
  return lines;
}
