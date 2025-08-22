import { User } from "../generated/prisma";
import prisma from "../src/config/database";

const User = {
  login: () => {},
  register: () => {},
  getUser: () => {},
  getAll: async (): Promise<User[]> => {
    return prisma.user.findMany();
  },
};

export default User;
