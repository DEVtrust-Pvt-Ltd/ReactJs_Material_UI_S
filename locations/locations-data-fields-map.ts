export function mapDataForTable(data) {
  const tableData = [];
  data?.locations?.edges?.forEach((row: any) => {
    const node = row?.node ?? {};
    tableData.push({
      id: node.id,
      name: node.name || "",
      locationTypeValue: node.locationType?.value,
      locationTypeId: node.locationType,
      hoursOfOperation: node.hoursOfOperation,
      fulladdress: `${node.address1}, ${node.city} ${node.state}`,
      address1: node.address1,
      address2: node.address2,
      countryObject: node.countryObject,
      city: node.city,
      stateId: node.stateObject,
      zip: node.zip,
      contactName: node.contactName,
      contactEmail: node.contactEmail,
      contactPhone: node.contactPhone,
      isDefault: node.isDefault,
      isConsolidationLocation: !!node.isConsolidationLocation,
      isPickupLocation: !!node.isPickupLocation,
      externalIdentifier: node.externalIdentifier?.identifier || "",
    });
  });
  return tableData;
}

// Map the location model's keys to display text and type of UI control.
interface locationFieldInterface {
  fields: string[]; // key name(s) in Order model from orderById query
  title: string; // title text displayed on screen
  key: string; // key name for object values (e.g. lookup value)
  type: string; // UI control type
  editField: string; // key name from orderEditFields query
  editable?: boolean; // is field editable
  displayable?: boolean; // is field displayable
  cellScale?: number; // width multiplier
  options?: any; // options list for select drop-down controls
  mutKey?: string; // key name passed to mutation (falls back to field name if not defined)
  defaultValue?: any; // dynamic, default value for the field
}

// Ordered list of location fields
export const locationFieldsMap = [
  {
    fields: ["countryObject"],
    title: "Country",
    key: "mapToOptions",
    type: "select",
    displayable: true,
    editField: "countries",
    mutKey: "countryId",
    cellScale: 3,
    editable: true,
    createValidators: ["required"],
    createErrorMsgs: ["Required"],
    valueKey: "value",
  },
  {
    fields: ["hoursOfOperation"],
    title: "Hours Of Operation",
    type: "text",
    displayable: true,
    editField: "hoursOfOperation",
    cellScale: 3,
    editable: true,
  },
  {
    fields: ["name"],
    title: "Location Name",
    type: "text",
    editField: "name",
    cellScale: 3,
    displayable: true,
    editable: true,
    createValidators: ["required"],
    createErrorMsgs: ["Required"],
  },
  {
    fields: ["locationTypeId"],
    title: "Location Type",
    key: "mapToOptions",
    type: "select",
    displayable: true,
    editField: "locationTypes",
    mutKey: "locationTypeId",
    cellScale: 3,
    editable: true,
    createValidators: ["required"],
    createErrorMsgs: ["Required"],
    valueKey: "value",
  },
  {
    fields: ["address1"],
    title: "Address",
    type: "text",
    editField: "address1",
    cellScale: 3,
    displayable: true,
    editable: true,
    createValidators: ["required"],
    createErrorMsgs: ["Required"],
  },
  {
    fields: ["address2"],
    title: "Address 2",
    type: "text",
    editField: "address2",
    cellScale: 3,
    displayable: true,
    editable: true,
  },
  {
    fields: ["city"],
    title: "City",
    type: "text",
    editField: "city",
    cellScale: 2,
    displayable: true,
    editable: true,
    createValidators: ["required"],
    createErrorMsgs: ["Required"],
  },
  {
    fields: ["stateId"],
    title: "State",
    key: "mapToOptions",
    type: "select",
    displayable: true,
    editField: "states",
    mutKey: "stateId",
    cellScale: 2,
    editable: true,
    createValidators: ["required"],
    createErrorMsgs: ["Required"],
    valueKey: "value",
  },
  {
    fields: ["zip"],
    title: "Postal Code",
    type: "text",
    editField: "zip",
    cellScale: 2,
    displayable: true,
    editable: true,
  },
  {
    fields: ["contactName"],
    title: "Primary Contact",
    type: "text",
    displayable: true,
    editField: "contactName",
    cellScale: 2,
    editable: true,
  },
  {
    fields: ["contactPhone"],
    title: "Contact Phone Number",
    type: "text",
    displayable: true,
    editField: "contactPhone",
    cellScale: 2,
    editable: true,
  },
  {
    fields: ["contactEmail"],
    title: "Contact Email",
    type: "text",
    displayable: true,
    editField: "contactEmail",
    cellScale: 2,
    editable: true,
    createValidators: ["matchRegexp:^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]{1,}@[a-zA-Z.-]{2,}[.]{1}[a-zA-Z]{2,}$"],
    createErrorMsgs: ["Email is invalid."],
  },
  {
    fields: ["externalIdentifier"],
    title: "Location Identifier",
    type: "text",
    displayable: true,
    editField: "externalIdentifier",
    cellScale: 2,
    editable: true,
    createValidators: ["required", "matchRegexp:^[A-Za-z0-9-]*$"],
    createErrorMsgs: ["Required", "No spaces or special characters except - are allowed"],
  },

  { fields: [null] },
  {
    fields: ["isConsolidationLocation"],
    title: "Consolidation Location",
    type: "checkbox",
    displayable: true,
    editField: "isConsolidationLocation",
    cellScale: 2,
    editable: true,
  },
  {
    fields: ["isPickupLocation"],
    title: "Pickup Location",
    type: "checkbox",
    displayable: true,
    editField: "isPickupLocation",
    cellScale: 2,
    editable: true,
  },
] as locationFieldInterface[];
