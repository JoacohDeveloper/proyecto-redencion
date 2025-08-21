export function getMoneyString(value) {
    return value.toLocaleString("en-US", {
        currency: "USD",
        style: "currency",
    });
}
