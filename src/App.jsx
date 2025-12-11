import { pdfjs } from "react-pdf";
import PDFViewer from "./PDFViewer";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
function App() {
  return (
    <>
      <div className="bg-gradient-to-r from-gray-500  to-gray-700">
        <PDFViewer />
      </div>
    </>
  );
}

export default App;
