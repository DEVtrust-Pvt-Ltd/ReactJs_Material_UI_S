export function mapDataForTable(data) {
  const tableData = data?.notesPrefillOptions?.notes?.map((o: any) => o);
  return tableData;
}
