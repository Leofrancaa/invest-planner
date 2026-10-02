import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
  const symbols = (
    request.nextUrl.searchParams.get("symbols") || "ITUB4,VALE3,PETR4,MGLU3"
  ).split(",");
  if (
    symbols.length > 12 ||
    symbols.some((s) => !/^[A-Z]{4}[0-9]{1,2}$/.test(s))
  )
    return NextResponse.json(
      { error: "Provide up to 12 valid B3 tickers." },
      { status: 400 },
    );
  const key = process.env.BRAPI_API_KEY,
    free = ["ITUB4", "VALE3", "PETR4", "MGLU3"];
  const supported = key ? symbols : symbols.filter((s) => free.includes(s));
  if (!supported.length)
    return NextResponse.json({
      quotes: [],
      unavailable: symbols,
      requiresKey: true,
    });
  try {
    const response = await fetch(
      `https://brapi.dev/api/v2/stocks/quote?symbols=${supported.join(",")}`,
      {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok)
      return NextResponse.json(
        {
          error:
            response.status === 429
              ? "Quote provider limit reached. Try again later."
              : "Quote request failed. Check provider access and plan.",
        },
        { status: 502 },
      );
    const payload = await response.json();
    const quotes = (payload.results || []).flatMap(
      (item: {
        symbol?: string;
        data?: {
          shortName?: string;
          regularMarketPrice?: number;
          regularMarketChangePercent?: number;
          regularMarketTime?: string;
        };
      }) => {
        const d = item.data;
        return d && typeof d.regularMarketPrice === "number"
          ? [
              {
                symbol: item.symbol,
                name: d.shortName,
                price: d.regularMarketPrice,
                change: d.regularMarketChangePercent ?? 0,
                timestamp: d.regularMarketTime,
              },
            ]
          : [];
      },
    );
    return NextResponse.json({
      quotes,
      unavailable: symbols.filter(
        (s) => !quotes.some((q: { symbol?: string }) => q.symbol === s),
      ),
      requiresKey: !key,
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Quotes are temporarily unavailable. Your portfolio is still accessible.",
      },
      { status: 502 },
    );
  }
}
