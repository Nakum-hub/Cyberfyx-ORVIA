// Infrastructure probe, not a consent workflow or a production worker.
export async function bootstrapProbe(marker:string):Promise<string>{
  if(!/^syn_probe_[a-f0-9]{32}$/.test(marker))throw new Error('Invalid synthetic marker');
  return marker;
}
