import http from "node:http";

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 8792);

const ROUTES = new Map([
  ["dover-calais", {
    id:"dover-calais", from:"Dover", to:"Calais", operator:"DFDS",
    sourceUrl:"https://www.dfds.com/en/passenger-ferries/ferry-crossings/ferries-to-france/dover-calais"
  }],
  ["calais-dover", {
    id:"calais-dover", from:"Calais", to:"Dover", operator:"DFDS",
    sourceUrl:"https://www.dfds.com/en/passenger-ferries/ferry-crossings/ferries-to-uk/calais-dover"
  }],
  ["dover-dunkirk", {
    id:"dover-dunkirk", from:"Dover", to:"Dunkirk", operator:"DFDS",
    sourceUrl:"https://www.dfds.com/en-gb/passenger-ferries/ferry-crossings/ferries-to-france/dover-dunkirk"
  }],
  ["dunkirk-dover", {
    id:"dunkirk-dover", from:"Dunkirk", to:"Dover", operator:"DFDS",
    sourceUrl:"https://www.dfds.com/en/passenger-ferries/ferry-crossings/ferries-to-uk/dunkirk-dover"
  }]
]);

function json(res,status,payload){
  res.writeHead(status,{
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
    "X-Content-Type-Options":"nosniff"
  });
  res.end(JSON.stringify(payload));
}

http.createServer((req,res)=>{
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method !== "GET" || url.pathname !== "/api/ferry-board") {
    return json(res,404,{error:"not_found"});
  }

  const route = ROUTES.get(url.searchParams.get("route") || "");
  if (!route) return json(res,400,{error:"unknown_route"});

  // Contract-first MVP. Do not fabricate timetable/status rows.
  // A provider adapter can populate departures once an approved, stable
  // official data endpoint is available.
  return json(res,200,{
    route,
    departures:[],
    updatedAt:new Date().toISOString(),
    stale:true,
    providerState:"awaiting_official_live_adapter"
  });
}).listen(PORT,HOST,()=>{
  console.log(`idesuss ferry-board API listening on http://${HOST}:${PORT}`);
});
