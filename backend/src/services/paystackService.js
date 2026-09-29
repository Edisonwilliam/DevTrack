const axios = require("axios");

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
});

const initializeTransaction = async ({
  email,
  amount,
  reference,
  metadata,
  callbackUrl,
}) => {
  const response = await paystack.post(
    "/transaction/initialize",
    {
      email,
      amount: String(amount),
      currency: "NGN",
      reference,
      metadata,
      callback_url: callbackUrl,
    }
  );

  const data = response.data?.data;

  if (!data?.authorization_url) {
    throw new Error(
      "Paystack did not return a checkout URL"
    );
  }

  return {
    checkoutUrl: data.authorization_url,
    accessCode: data.access_code,
    reference: data.reference || reference,
  };
};

const verifyTransaction = async (reference) => {
  const response = await paystack.get(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );

  return response.data?.data;
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
};