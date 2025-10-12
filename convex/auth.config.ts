const authConfig = {
  providers: [
    {
      domain:
        process.env.CLERK_JWT_ISSUER_DOMAIN ??
        "https://deep-ray-88.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
