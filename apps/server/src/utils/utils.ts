export const validDomains = () => {
  const domains = ["gmail.com"];
  if (process.env.NODE_ENV === "development") {
    domains.push("exmaple.com", "example.org");
  }
  return domains;
};
