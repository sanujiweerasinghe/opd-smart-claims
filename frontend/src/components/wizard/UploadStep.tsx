import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadStepProps {
  documents: File[];
  onUpdate: (documents: File[]) => void;
  onSubmit: () => void;
  onBack: () => void;
}

const UploadStep = ({ documents, onUpdate, onSubmit, onBack }: UploadStepProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      onUpdate([...documents, ...files]);
    },
    [documents, onUpdate]
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onUpdate([...documents, ...files]);
    }
  };

  const removeDocument = (index: number) => {
    onUpdate(documents.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    setIsAnalyzing(true);
    // Simulate AI verification
    setTimeout(() => {
      setIsAnalyzing(false);
      onSubmit();
    }, 1500);
  };

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground mb-2">Upload Documents</h2>
      <p className="text-muted-foreground mb-6">
        AI will automatically verify your documents
      </p>

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 cursor-pointer",
          isDragging
            ? "border-primary bg-secondary"
            : "border-border hover:border-primary/50 hover:bg-muted/50"
        )}
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          type="file"
          id="file-input"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-foreground font-medium">Click to upload or drag and drop</p>
        <p className="text-sm text-muted-foreground mt-1">
          Required: Claim Form, Medical Bill, Prescription, Health Card
        </p>
      </div>

      {/* Uploaded Files */}
      {documents.length > 0 && (
        <div className="mt-6">
          <p className="text-sm font-medium text-foreground mb-3">
            Uploaded Documents ({documents.length})
          </p>
          <div className="space-y-2">
            {documents.map((doc, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm text-foreground truncate max-w-[200px]">
                    {doc.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-success flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    Verified (95%)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeDocument(index);
                    }}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analyzing Banner */}
      {isAnalyzing && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <span className="text-sm text-blue-700">
            AI is analyzing your documents. This may take a few moments...
          </span>
        </div>
      )}

      <div className="flex gap-3 mt-8">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          variant="hero" 
          onClick={handleSubmit} 
          disabled={documents.length === 0 || isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            "Submit Claim"
          )}
        </Button>
      </div>
    </div>
  );
};

export default UploadStep;
