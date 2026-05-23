import { mergeAddressParts, parseRomanianAddress, type StructuredAddress } from "@/lib/address";
import { splitRomanianFullName, type VaultProfile } from "@/store/vault";

export type ScanProfileFields = {
  fullName: string;
  cnp: string;
  birthDate: string;
  address: string;
  addressStreet: string;
  addressNumber: string;
  addressBlock: string;
  addressStair: string;
  addressFloor: string;
  addressApartment: string;
  addressLocality: string;
  addressCounty: string;
  addressSector: string;
  addressCountry: string;
  birthLocality: string;
  birthCounty: string;
  idCardSeries: string;
  idCardNumber: string;
  idCardIssuedBy: string;
  issueDate: string;
  expiryDate: string;
};

export function buildVaultProfilePatch(fields: ScanProfileFields): Partial<VaultProfile> {
  const patch: Partial<VaultProfile> = {};

  if (fields.fullName.trim()) {
    patch.fullName = fields.fullName.trim();
    const split = splitRomanianFullName(patch.fullName);
    patch.firstName = split.firstName;
    patch.lastName = split.lastName;
  }
  if (fields.cnp.trim()) patch.cnp = fields.cnp.trim();
  if (fields.birthDate.trim()) patch.birthDate = fields.birthDate.trim();
  if (fields.birthLocality.trim()) patch.birthLocality = fields.birthLocality.trim();
  if (fields.birthCounty.trim()) patch.birthCounty = fields.birthCounty.trim();
  if (fields.issueDate.trim()) patch.idCardIssueDate = fields.issueDate.trim();
  if (fields.expiryDate.trim()) patch.idCardExpiryDate = fields.expiryDate.trim();
  if (fields.idCardSeries.trim()) patch.idCardSeries = fields.idCardSeries.trim();
  if (fields.idCardNumber.trim()) patch.idCardNumber = fields.idCardNumber.trim();
  if (fields.idCardIssuedBy.trim()) patch.idCardIssuedBy = fields.idCardIssuedBy.trim();

  const fromParts: Partial<StructuredAddress> = {
    street: fields.addressStreet,
    streetNumber: fields.addressNumber,
    block: fields.addressBlock,
    stair: fields.addressStair,
    floor: fields.addressFloor,
    apartment: fields.addressApartment,
    locality: fields.addressLocality,
    county: fields.addressCounty,
    sector: fields.addressSector,
    country: fields.addressCountry,
  };

  const hasParts = Object.values(fromParts).some((v) => v?.trim());
  if (hasParts) {
    patch.addressParts = mergeAddressParts(parseRomanianAddress(""), fromParts);
  } else if (fields.address.trim()) {
    patch.addressParts = parseRomanianAddress(fields.address.trim());
  }

  return patch;
}
