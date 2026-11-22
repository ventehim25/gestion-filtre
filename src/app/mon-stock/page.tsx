"use client";
// « Mon stock » (22/11/2026, BIBLE §8.50) : combien il reste, au chiffre près. Le contenu est le composant partagé
// StockDetaille (le même que dans « Stock voiture », un seul stock — §8.55).
import Header from "@/components/Header";
import StockDetaille from "@/components/StockDetaille";

export default function MonStockPage() {
  return (
    <div>
      <Header title="myStock" />
      <StockDetaille />
    </div>
  );
}
