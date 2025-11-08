import * as protobuf from "protobufjs";

export const loadUsersAsProto = async (jsonPath: string): Promise<User[]> => {
  const root = await protobuf.load("/src/protos/user.proto");
  const UserList = root.lookupType("userproto.UserList");

  const response = await fetch(jsonPath);
  const json = await response.json();

  const message = UserList.create({ users: json });
  const buffer = UserList.encode(message).finish();

  const decoded = UserList.decode(buffer);
  const users = UserList.toObject(decoded, { longs: String, enums: String, defaults: true });

  return users.users;
};