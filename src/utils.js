export const updateField = (setFields, id, updatedProps) => {
  setFields((prev) =>
    prev.map((f) =>
      f.id === id
        ? { ...f, ...updatedProps } // merge new changes into the existing field
        : f
    )
  );
};

export const deleteFieldKey = (setFields, id) => {
  setFields((prev) =>
    prev.map((f) =>
      f.id === id
        ? (() => {
            const updated = { ...f };
            delete updated.src; // remove height
            return updated;
          })()
        : f
    )
  );
};

export const deleteFieldFontSize = (setFields, id) => {
  setFields((prev) =>
    prev.map((f) =>
      f.id === id
        ? (() => {
            const updated = { ...f };
            delete updated.fontSize; // remove height
            return updated;
          })()
        : f
    )
  );
};
