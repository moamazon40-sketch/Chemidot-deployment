import { useLocation } from "wouter";
import { Product } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ArrowRight, Package } from "lucide-react";
import { formatCurrency, formatCasNumber } from "@/lib/formatters";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [, navigate] = useLocation();

  return (
    <Card className="flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group">
      <button
        type="button"
        onClick={() => navigate(`/products/${product.id}`)}
        className="block relative aspect-square overflow-hidden bg-muted text-left"
      >
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-secondary/50">
            <Package className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        {product.collectiveEligible && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary/90 hover:bg-primary backdrop-blur-sm shadow-sm border-none">
              Collective Order
            </Badge>
          </div>
        )}
      </button>
      
      <CardHeader className="p-4 pb-2 space-y-1 flex-none">
        <div className="flex justify-between items-start gap-2">
          <Badge variant="outline" className="text-xs font-normal">
            {product.categoryName}
          </Badge>
          <span className="text-xs text-muted-foreground font-mono">
            {formatCasNumber(product.casNumber)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/products/${product.id}`)}
          className="hover:text-primary transition-colors text-left"
        >
          <h3 className="font-bold line-clamp-2 leading-tight mt-1">{product.name}</h3>
        </button>
      </CardHeader>
      
      <CardContent className="p-4 pt-0 flex-grow space-y-3">
        <div className="flex items-center text-sm text-muted-foreground">
          <button
            type="button"
            className="hover:text-foreground flex items-center gap-1.5 transition-colors"
            onClick={() => navigate(`/suppliers/${product.supplierId}`)}
          >
            <span className="truncate max-w-[140px]">{product.supplierName}</span>
            {product.supplierVerified && (
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            )}
          </button>
          <span className="mx-2 text-border">•</span>
          <span className="truncate">{product.supplierCountry}</span>
        </div>
        
        <div className="pt-2 border-t flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">MOQ</span>
            <span className="font-medium">{product.moq} {product.moqUnit}</span>
          </div>
          {product.basePrice && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Price</span>
              <span className="font-bold text-primary">
                {formatCurrency(product.basePrice, product.currency ?? "USD")}/{product.moqUnit}
              </span>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 mt-auto">
        <Button
          type="button"
          variant="secondary"
          className="w-full justify-between group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          onClick={() => navigate(`/products/${product.id}`)}
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
