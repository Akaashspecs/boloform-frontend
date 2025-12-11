import { useEffect, useRef, useState } from "react";
import { Document, Page } from "react-pdf";
import SignaturePad from "signature_pad";
import Loader from "./Loader";
import { deleteFieldFontSize, deleteFieldKey, updateField } from "./utils";
export default function PdfEditor() {
  const ORIGINAL_PDF_WIDTH = 592;
  const [pdfFile, setPdfFile] = useState(null);
  const [radioValue, setRadioValue] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [showImage, setShowImage] = useState(false);
  const [showDate, setShowDate] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showRadio, setShowRadio] = useState(false);
  const [date, setDate] = useState(null);
  const [signatureValue, setSignatureValue] = useState(null);
  const [aboutValue, setAboutValue] = useState(null);
  const imgRef = useRef(null);
  const signRef = useRef(null);
  const observerRef = useRef(null);
  const [resizing, setResizing] = useState(null);
  const containerRef = useRef(null);
  const [renderWidth, setRenderWidth] = useState(592);
  const scaleFactor = renderWidth / ORIGINAL_PDF_WIDTH;
  const [dragging, setDragging] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const [signatureTypes, setSignatureTypes] = useState(false);
  const [signDraw, setSignDraw] = useState(false);
  const [loading, setLoading] = useState(false);
  /** Load PDF */

  const [fields, setFields] = useState([
    { id: 1, type: "textarea", x: 350, y: 50, width: 200, height: 40 },
    { id: 2, type: "signature", x: 350, y: 100, width: 150, height: 50 },
    { id: 3, type: "date", x: 350, y: 150, width: 140, height: 40 },
    { id: 4, type: "image", x: 350, y: 200, width: 140, height: 80 },
    { id: 5, type: "radio", x: 350, y: 30, width: 20, height: 20 },
  ]);
  console.log(fields);
  const canvasRef = useRef(null);
  const signaturePadRef = useRef(null);

  const handdleSignatureType = () => {
    setShowSignature(true);
    deleteFieldKey(setFields, 2);
  };

  useEffect(() => {
    if (!signDraw) return;
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    canvas.width = 400 * window.devicePixelRatio;
    canvas.height = 200 * window.devicePixelRatio;
    canvas.style.width = "400px";
    canvas.style.height = "200px";

    const ctx = canvas.getContext("2d");
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const signaturePad = new SignaturePad(canvas, {
      backgroundColor: "transparent",
      penColor: "red",
    });

    signaturePadRef.current = signaturePad;

    return () => {
      signaturePadRef.current?.clear();
      signaturePadRef.current = null;
    };
  }, [signDraw]);

  const clearSignature = () => {
    signaturePadRef.current.clear();
    setSignDraw(false);
  };

  const saveSignature = () => {
    const dataURL = signaturePadRef.current.toDataURL("image/png");
    updateField(setFields, 2, { src: dataURL });
    setSignDraw(false);
    setShowSignature(true);
    deleteFieldFontSize(setFields, 2);
    setSignatureValue(null);
  };

  const updateImageField = (id, updatedProps) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updatedProps } : f))
    );
  };

  const startObservingSignature = (fieldId) => {
    if (!signRef.current) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        updateImageField(fieldId, { imgWidth: width, imgHeight: height });
      }
    });

    observerRef.current.observe(signRef.current);
  };
  const startObservingImage = (fieldId) => {
    if (!imgRef.current) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;

        updateImageField(fieldId, { imgWidth: width, imgHeight: height });
      }
    });

    observerRef.current.observe(imgRef.current);
  };

  useEffect(() => {
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    const loadLocalPdf = async () => {
      const response = await fetch("/detail.pdf");
      const blob = await response.blob();

      const file = new File([blob], "detail.pdf", {
        type: "application/pdf",
      });

      setPdfFile(file);
    };

    loadLocalPdf();
  }, []);

  const upload = async () => {
    try {
      setLoading(true);
      const formData = new FormData();

      formData.append("pdfId", pdfFile.lastModified);
      formData.append("pdf", pdfFile);
      formData.append("fields", JSON.stringify(fields));
      formData.append("offset", JSON.stringify(offset));
      formData.append("scaleFactor", scaleFactor);

      const res = await fetch(
        "http://boloform-backend-production.up.railway.app/api/edit-pdf",
        {
          method: "POST",
          body: formData,
        }
      );

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setRenderWidth(containerRef.current.offsetWidth);
      }
    };
    update();

    window.addEventListener("resize", update);

    return () => window.removeEventListener("resize", update);
  }, []);

  /** Drag Start */
  const startDrag = (e, field) => {
    e.stopPropagation();
    setDragging(field.id);

    const rect = containerRef.current.getBoundingClientRect();
    setOffset({
      x: e.clientX - rect.left - field.x * scaleFactor,
      y: e.clientY - rect.top - field.y * scaleFactor,
    });
  };

  /** Resize Start */
  const startResize = (e, field) => {
    e.stopPropagation();

    if (field.id !== 5) {
      setResizing(field.id);
      startObservingImage(field.id);
      startObservingSignature(field.id);
      const rect = containerRef.current.getBoundingClientRect();
      setOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  /** Mouse Move */
  const handleMove = (e) => {
    if (!dragging && !resizing) return;

    const rect = containerRef.current.getBoundingClientRect();

    if (dragging) {
      setFields((prev) =>
        prev.map((f) =>
          f.id === dragging
            ? {
                ...f,
                x: (e.clientX - rect.left - offset.x) / scaleFactor,
                y: (e.clientY - rect.top - offset.y) / scaleFactor,
              }
            : f
        )
      );
    }

    if (resizing) {
      console.log("xxxxx");

      setFields((prev) =>
        prev.map((f) =>
          f.id === resizing
            ? {
                ...f,
                width:
                  (e.clientX - rect.left - f.x * scaleFactor) / scaleFactor,
                height:
                  (e.clientY - rect.top - f.y * scaleFactor) / scaleFactor,
                fontSize: f.height * 0.4 * scaleFactor,
              }
            : f
        )
      );
    }
  };

  const stopActions = () => {
    setDragging(null);
    setResizing(null);
    if (observerRef.current) observerRef.current.disconnect();
  };

  const renderField = (field) => {
    return (
      <div>
        {field.type === "textarea" && showAbout && (
          <div
            key={field.id}
            onMouseDown={(e) => startDrag(e, field)}
            className="absolute group    cursor-move"
            style={{
              top: field.y * scaleFactor,
              left: field.x * scaleFactor,
              width: field.width * scaleFactor,
              height: field.height * scaleFactor,
            }}
          >
            <textarea
              placeholder="Tell about yourself"
              className="w-full  h-full border p-1 "
              value={aboutValue}
              style={{
                fontSize: `${29 * 0.4 * scaleFactor}px`,
              }}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                setAboutValue(e.target.value);
                updateField(setFields, field.id, {
                  value: value,
                  fontSize: field.height * 0.4 * scaleFactor,
                });
              }}
            />
            <div
              onMouseDown={(e) => startResize(e, field)}
              className="absolute z-10 bottom-0 right-0 w-4 h-4 group-hover:bg-blue-500 cursor-se-resize rounded"
            ></div>
          </div>
        )}

        {field.type === "radio" && showRadio && (
          <div
            key={field.id}
            onMouseDown={(e) => startDrag(e, field)}
            className="absolute     cursor-move"
            style={{
              top: field.y * scaleFactor,
              left: field.x * scaleFactor,
              width: field.width * scaleFactor,
              height: field.height * scaleFactor,
            }}
          >
            {" "}
            <input
              type="radio"
              placeholder="Tell about yourself"
              className="w-full  h-full border p-1 resize"
              checked={radioValue}
              onClick={(e) => {
                const value = e.target.value;
                if (!value) return;
                setRadioValue(!radioValue);
                updateField(setFields, field.id, {
                  value: !radioValue,
                });
              }}
            />
          </div>
        )}
        {field.type === "signature" && showSignature && (
          <span
            key={field.id}
            onMouseDown={(e) => startDrag(e, field)}
            className="absolute   group   cursor-move"
            style={{
              top: field.y * scaleFactor,
              left: field.x * scaleFactor,
              width: field.width * scaleFactor,
              height: field.height * scaleFactor,
            }}
          >
            {field.src ? (
              <div className="w-full h-full border-2  flex items-center justify-center">
                <img
                  ref={signRef}
                  src={field.src}
                  alt="preview"
                  className="max-w-full border relative z-10 max-h-full object-contain"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                    WebkitUserDrag: "none",
                  }}
                  onLoad={(e) => {
                    if (field.imgHeight && field.imgWidth) return;

                    const renderedHeight = e.target.clientHeight;
                    const renderedWidth = e.target.clientWidth;

                    updateField(setFields, field.id, {
                      imgHeight: renderedHeight,
                      imgWidth: renderedWidth,
                    });

                    console.log(
                      "Saved only once:",
                      renderedWidth,
                      renderedHeight
                    );
                  }}
                />
              </div>
            ) : (
              <input
                placeholder="signature"
                className="w-full leading-0   h-full hover:border "
                value={signatureValue}
                style={{
                  fontSize: `${field.height * 0.3 * scaleFactor}px`,
                  lineHeight: 0,
                }}
                onChange={(e) => {
                  const value = e.target.value;
                  if (!value) return;
                  setSignatureValue(e.target.value);
                  updateField(setFields, field.id, {
                    value: value,
                    fontSize: field.height * 0.5 * scaleFactor,
                  });
                }}
              />
            )}
            <div
              onMouseDown={(e) => startResize(e, field)}
              className="absolute z-10 bottom-0 right-0 w-4 h-4 group-hover:bg-blue-500 cursor-se-resize rounded"
            ></div>
          </span>
        )}
        {field.type === "date" && showDate && (
          <div
            key={field.id}
            onMouseDown={(e) => startDrag(e, field)}
            className="absolute   group  cursor-move"
            style={{
              top: field.y * scaleFactor,
              left: field.x * scaleFactor,
              width: field.width * scaleFactor,
              height: field.height * scaleFactor,
            }}
          >
            {" "}
            <input
              type="date"
              className="w-full flex items-center justify-start h-full hover:border outline-none"
              style={{
                fontSize: `${field.height * 0.4 * scaleFactor}px`,
                lineHeight: 1,
              }}
              value={date}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                setDate(e.target.value);
                updateField(setFields, field.id, {
                  value: value,
                  fontSize: field.height * 0.4 * scaleFactor,
                });
              }}
            />
            <div
              onMouseDown={(e) => startResize(e, field)}
              className="absolute z-10 bottom-0 right-0 w-4 h-4 group-hover:bg-blue-500 cursor-se-resize rounded"
            ></div>
          </div>
        )}

        {field.type === "image" && showImage && (
          <div
            key={field.id}
            onMouseDown={(e) => startDrag(e, field)}
            className="absolute     cursor-move"
            style={{
              top: field.y * scaleFactor,
              left: field.x * scaleFactor,
              width: field.width * scaleFactor,
              height: field.height * scaleFactor,
            }}
          >
            {" "}
            <div className="w-full h-full border-2  flex items-center justify-center">
              {field.src ? (
                <img
                  ref={imgRef}
                  src={field.src}
                  alt="preview"
                  className="max-w-full border relative z-10 max-h-full object-contain"
                  style={{
                    pointerEvents: "none",
                    userSelect: "none",
                    WebkitUserDrag: "none",
                  }}
                  onLoad={(e) => {
                    if (field.imgHeight && field.imgWidth) return;

                    const renderedHeight = e.target.clientHeight;
                    const renderedWidth = e.target.clientWidth;

                    updateField(setFields, field.id, {
                      imgHeight: renderedHeight,
                      imgWidth: renderedWidth,
                    });

                    console.log(
                      "Saved only once:",
                      renderedWidth,
                      renderedHeight
                    );
                  }}
                />
              ) : (
                <label className=" text-sm cursor-pointer">
                  Upload Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];

                      if (!file) return;

                      if (file.type !== "image/png") {
                        alert("Only PNG images are allowed!");

                        e.target.value = "";
                        return;
                      }

                      const reader = new FileReader();
                      console.log(reader);
                      reader.onload = () => {
                        updateField(setFields, field.id, {
                          src: reader.result,
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              )}
            </div>
            <div
              onMouseDown={(e) => startResize(e, field)}
              className="absolute z-10 bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded"
            ></div>
          </div>
        )}

        {field.id !== 5 && (
          <div
            onMouseDown={(e) => startResize(e, field)}
            className="absolute z-10 bottom-0 right-0 w-4 h-4 hover:bg-blue-500 cursor-se-resize rounded"
          ></div>
        )}
      </div>
    );
  };

  return (
    <div>
      {loading && <Loader />}

      {signDraw && (
        <div className="flex fixed backdrop-blur-sm h-screen w-screen z-40  justify-center items-center">
          <div className="bg-white ">
            <canvas
              ref={canvasRef}
              className="bg-red-300"
              style={{
                border: "2px solid black",
                borderRadius: "4px",
                width: "400px",
                height: "200px",
              }}
            />

            <div className="flex gap-3 mt-3">
              <button
                onClick={clearSignature}
                className="bg-red-500 text-white px-3 py-2"
              >
                Clear
              </button>

              <button
                onClick={saveSignature}
                className="bg-blue-500 text-white px-3 py-2"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="py-10  flex flex-wrap justify-center gap-5">
        <div className="relative">
          <button
            onClick={() => setSignatureTypes(!signatureTypes)}
            className="bg-gradient-to-r from-indigo-500  to-blue-500 text-white px-3 py-2 rounded-sm"
          >
            Signature
          </button>

          {signatureTypes && (
            <div className="flex absolute  gap-5 top-16 z-10 -left-4">
              <div
                onClick={() => setSignDraw(true)}
                className="bg-gradient-to-r from-indigo-500  to-blue-500 text-white px-3 py-2 rounded-sm"
              >
                Draw
              </div>
              <div
                onClick={() => handdleSignatureType()}
                className="bg-gradient-to-r from-indigo-500  to-blue-500 text-white px-3 py-2 rounded-sm"
              >
                Type
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setShowAbout(!showAbout)}
          className="bg-gradient-to-r from-indigo-500  to-blue-500 text-white px-3 py-2 rounded-sm"
        >
          About Text
        </button>
        <button
          onClick={() => setShowImage(!showImage)}
          className="bg-gradient-to-r from-indigo-500  to-blue-500 text-white px-3 py-2 rounded-sm"
        >
          Image
        </button>
        <button
          onClick={() => setShowRadio(!showRadio)}
          className="bg-gradient-to-r from-indigo-500  to-blue-500 text-white px-3 py-2 rounded-sm"
        >
          Radio Button
        </button>
        <button
          onClick={() => setShowDate(!showDate)}
          className="bg-gradient-to-r from-indigo-500  to-blue-500 text-white px-3 py-2 rounded-sm"
        >
          Date
        </button>
      </div>
      <div
        ref={containerRef}
        className="relative w-full max-w-[900px] mx-auto select-none "
        onMouseMove={handleMove}
        onMouseUp={stopActions}
      >
        <Document file="/detail.pdf" className="bg-transparent border">
          <Page
            pageNumber={1}
            width={renderWidth}
            renderAnnotationLayer={false}
            renderTextLayer={false}
          />

          {/* Render All Draggable + Resizable Fields */}
          <div className="flex flex-wrap">
            {fields.map((field) => renderField(field))}
          </div>
        </Document>
        <div
          onClick={() => upload()}
          className="bg-red-400 px-3 py-2 w-fit rounded-md my-3 text-white"
        >
          {" "}
          Upload
        </div>
      </div>
    </div>
  );
}
