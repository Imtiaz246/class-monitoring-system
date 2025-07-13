export interface CreateBatchData {
  batchName: string;
}

export interface UpdateBatchData {
  batchName: string;
}

export interface GetBatchesQuery {
  page: number;
  limit: number;
}

export interface BatchResponse {
  batchId: string;
  batchName: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    updatedAt: Date;
  };
}

export interface BatchListResponse {
  data: BatchResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface BatchCreateResponse {
  message: string;
  data: BatchResponse;
}

export interface BatchUpdateResponse {
  message: string;
}