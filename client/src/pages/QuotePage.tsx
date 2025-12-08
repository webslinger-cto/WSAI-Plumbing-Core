import QuoteBuilder from "@/components/QuoteBuilder";
import { useToast } from "@/hooks/use-toast";

export default function QuotePage() {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quote Tool</h1>
        <p className="text-muted-foreground">
          Create and send professional quotes to customers
        </p>
      </div>

      <QuoteBuilder
        onSave={(quote) => {
          console.log("Quote saved:", quote);
          toast({
            title: "Quote Saved",
            description: `Draft quote for ${quote.customerName} saved successfully.`,
          });
        }}
        onSend={(quote) => {
          console.log("Quote sent:", quote);
          toast({
            title: "Quote Sent",
            description: `Quote for $${quote.total.toFixed(2)} sent to ${quote.customerName}.`,
          });
        }}
      />
    </div>
  );
}
