
import { FileTransfer } from "@/components/FileTransfer.jsx";
import { Toaster } from "@/components/ui/toaster";
import { useSearchParams } from "react-router-dom";

const Index = () => {
  const [searchParams] = useSearchParams();
  const connectToPeerId = searchParams.get('peer');

  return (
    <>
      <FileTransfer connectToPeerId={connectToPeerId} />
      <Toaster />
    </>
  );
};

export default Index;
