const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/predict`
  : "http://localhost:5000/predict";

export async function predict(data) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ features: data }),
  });

  if (!res.ok) {
    throw new Error("API request failed");
  }

  return await res.json();
}