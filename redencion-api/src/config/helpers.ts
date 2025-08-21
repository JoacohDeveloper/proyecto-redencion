export function getMoneyString(value: number): string {
  return value.toLocaleString("en-US", {
    currency: "USD",
    style: "currency",
  });
}
