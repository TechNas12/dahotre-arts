import { Client } from "@opensearch-project/opensearch";

let client: Client | null = null;

export function getOpenSearchClient() {
  if (!process.env.OPENSEARCH_URL) {
    return null;
  }
  
  if (!client) {
    try {
      client = new Client({
        node: process.env.OPENSEARCH_URL,
        maxRetries: 1,
        requestTimeout: 2500,
      });
    } catch (e) {
      console.error("Failed to initialize OpenSearch client:", e);
      return null;
    }
  }
  return client;
}

export async function searchIndex(index: string, query: string, fields: string[], size: number = 250) {
  const osClient = getOpenSearchClient();
  if (!osClient) return null;

  try {
    const response = await osClient.search({
      index,
      body: {
        size: Math.min(size, 500),
        query: {
          multi_match: {
            query,
            fields,
            type: "phrase_prefix",
          },
        },
      },
    });

    const hits = response.body.hits.hits;
    const ids = hits.map((hit: any) => parseInt(hit._id, 10));
    
    const totalHits = response.body.hits.total;
    const total = typeof totalHits === 'number' ? totalHits : (totalHits?.value ?? 0);
    
    return { ids, total };
  } catch (e) {
    console.error(`Error searching OpenSearch index ${index}:`, e);
    return null;
  }
}

export async function indexDocument(index: string, id: number, doc: Record<string, any>) {
  const osClient = getOpenSearchClient();
  if (!osClient) return false;

  try {
    await osClient.index({
      index,
      id: id.toString(),
      body: doc,
      refresh: true, // Immediate refresh for search availability
    });
    return true;
  } catch (e) {
    console.error(`Error indexing document in ${index}:`, e);
    return false;
  }
}

export async function bulkIndexDocuments(index: string, docs: { id: number, body: Record<string, any> }[]) {
  const osClient = getOpenSearchClient();
  if (!osClient || docs.length === 0) return false;

  const body = docs.flatMap(doc => [
    { index: { _index: index, _id: doc.id.toString() } },
    doc.body
  ]);

  try {
    const response = await osClient.bulk({ refresh: true, body });
    if (response.body.errors) {
      console.error("Errors during bulk index:", response.body.items);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`Error bulk indexing documents in ${index}:`, e);
    return false;
  }
}

export async function deleteDocument(index: string, id: number) {
  const osClient = getOpenSearchClient();
  if (!osClient) return false;

  try {
    await osClient.delete({
      index,
      id: id.toString(),
      refresh: true,
    });
    return true;
  } catch (e: any) {
    // Ignore NOT_FOUND errors
    if (e.meta && e.meta.statusCode === 404) return true;
    console.error(`Error deleting document in ${index}:`, e);
    return false;
  }
}

// Function to safely extract strings for indexing without nulls/undefined
export function extractForIndex(val: string | null | undefined): string {
  return val || "";
}
