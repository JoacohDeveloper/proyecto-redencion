"use client";

import { PersonIcon } from "@radix-ui/react-icons";
import { Popover, PopoverTrigger, PopoverContent } from "@heroui/popover";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import LoginModal from "./login-modal";
import RegisterModal from "./register-modal";

export default function Account() {
  const {
    isOpen: isOpenLogin,
    onOpen: onOpenLogin,
    onOpenChange: onOpenChangeLogin,
  } = useDisclosure();

  const {
    isOpen: isOpenRegister,
    onOpen: onOpenRegister,
    onOpenChange: onOpenChangeRegister,
  } = useDisclosure();

  return (
    <Popover placement="bottom" showArrow={true}>
      <PopoverTrigger>
        <PersonIcon className="cursor-pointer" width={24} height={24} />
      </PopoverTrigger>
      <PopoverContent>
        <div className="px-1 py-2">
          <div className="flex flex-col gap-4">
            <Button onPress={onOpenLogin} className="text-small font-bold">
              Login
            </Button>
            <Button onPress={onOpenRegister} className="text-small font-bold">
              Register
            </Button>
          </div>
          <LoginModal
            isOpen={isOpenLogin}
            onOpenChange={onOpenChangeLogin}
            placement={""}
          />
          <RegisterModal
            isOpen={isOpenRegister}
            onOpenChange={onOpenChangeRegister}
            placement={""}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
