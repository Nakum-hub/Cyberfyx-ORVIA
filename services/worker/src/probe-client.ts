import { Client,Connection } from '@temporalio/client';
export async function connectTemporal(profile:{temporal_port:number;temporal_namespace:string}){
  const connection=await Connection.connect({address:`127.0.0.1:${profile.temporal_port}`,connectTimeout:'5s'});
  const client=new Client({connection,namespace:profile.temporal_namespace});
  return {connection,client};
}
