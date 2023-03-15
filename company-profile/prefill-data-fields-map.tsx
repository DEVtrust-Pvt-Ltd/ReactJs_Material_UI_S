export function mapDataForTable(data) {
  const tableData = data?.trackingEventsPrefillOptions?.tracking_events?.map(
    (o: any) => o
  );
  return tableData;
}
