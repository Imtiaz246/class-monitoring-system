export interface CreateRoomData {
  roomName: string;
  location: string;
}

export interface GetRoomsQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export interface RoomResponse {
  roomId: string;
  roomName: string;
  location: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
    updatedAt: string;
  };
}

export interface PaginatedRoomsResponse {
  data: RoomResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RoomErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}