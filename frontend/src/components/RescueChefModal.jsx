import { useState, useMemo } from "react";
import { Sparkles, Utensils, X, Clock, Flame, BookOpen, ShieldCheck, Copy, Check } from "lucide-react";

/** Built-in Zero-Waste Culinary Intelligence Matrix */
const CULINARY_RECIPES = {
  produce: [
    {
      title: "Hearty Garden Minestrone & Broth",
      time: "25 mins",
      difficulty: "Easy",
      prep: "Chop mixed vegetables into uniform 1/2 inch cubes.",
      steps: [
        "Sauté aromatics in olive oil until translucent (approx 4-5 minutes).",
        "Add chopped vegetables, vegetable stock, and diced tomatoes; bring to a rolling boil.",
        "Simmer on low for 15-20 minutes until tender. Season with salt, pepper, and fresh herbs.",
        "Portion into heat-safe containers for immediate service or blast chilling.",
      ],
      preservation: "Cool rapidly to <4°C. Freeze in airtight containers for up to 3 months. Can also be dehydrated into instant soup bouillon powder.",
      yieldPerKg: "~4 large meal portions per kg",
    },
    {
      title: "Roasted Harvest Vegetable Puree / Mash",
      time: "30 mins",
      difficulty: "Easy",
      prep: "Toss vegetables with light oil, sea salt, and garlic.",
      steps: [
        "Roast at 200°C (400°F) for 20-25 minutes until caramelized and tender.",
        "Transfer to a high-speed blender or commercial food processor with vegetable broth or cream.",
        "Blend until velvety smooth. Use as a base for sauces, soups, or a rich side dish.",
      ],
      preservation: "Refrigerate up to 5 days or freeze in pre-measured 1-liter deli containers.",
      yieldPerKg: "~3.5 portions per kg",
    },
  ],
  dairy: [
    {
      title: "Artisanal Herb & Garlic Farmer's Cheese",
      time: "20 mins",
      difficulty: "Medium",
      prep: "Bring milk or dairy base to a gentle simmer (85°C / 185°F).",
      steps: [
        "Gently stir in lemon juice or white vinegar (2 tbsp per liter) until curds separate from whey.",
        "Remove from heat and let rest for 10 minutes.",
        "Strain through cheesecloth or a fine mesh sieve for 15-30 minutes.",
        "Fold in sea salt, cracked black pepper, and minced herbs. Shape and refrigerate.",
      ],
      preservation: "Store in an airtight container submerged in olive oil with rosemary for up to 2 weeks.",
      yieldPerKg: "~200g artisanal cheese per liter",
    },
    {
      title: "Velvety Béchamel & Mornay Sauce Base",
      time: "15 mins",
      difficulty: "Easy",
      prep: "Melt equal parts butter and flour to create a blonde roux.",
      steps: [
        "Slowly whisk in warmed milk/dairy to prevent lumps from forming.",
        "Simmer gently for 8-10 minutes while continuously stirring until thick and glossy.",
        "Season with grated nutmeg, white pepper, and optional hard cheese for gratins and pastas.",
      ],
      preservation: "Freeze flat in zip-seal bags for up to 2 months; reheat gently with a splash of milk.",
      yieldPerKg: "~5 sauce portions per liter",
    },
  ],
  bakery: [
    {
      title: "Golden Garlic & Herb Croutons",
      time: "15 mins",
      difficulty: "Very Easy",
      prep: "Cut stale or near-expiry bread/pastries into uniform 3/4-inch cubes.",
      steps: [
        "Toss generously with olive oil, garlic powder, dried oregano, and sea salt.",
        "Spread in a single layer on parchment-lined baking trays.",
        "Bake at 180°C (350°F) for 12-15 minutes until golden brown and completely crisp.",
        "Cool thoroughly before packaging.",
      ],
      preservation: "Store in airtight bins with food-grade moisture absorbers for up to 30 days at room temperature.",
      yieldPerKg: "~10 salad/soup garnish servings per loaf",
    },
    {
      title: "Classic Cinnamon French Toast Casserole",
      time: "35 mins",
      difficulty: "Easy",
      prep: "Tear bread into bite-sized pieces into a greased commercial baking pan.",
      steps: [
        "Whisk together milk, eggs, cinnamon, vanilla extract, and brown sugar.",
        "Pour custard evenly over bread; press down lightly to absorb.",
        "Bake at 175°C (350°F) for 30 minutes until puffed and golden brown.",
      ],
      preservation: "Can be pre-assembled, chilled overnight, and baked fresh for morning service.",
      yieldPerKg: "~6 hearty breakfast servings per loaf",
    },
  ],
  prepared: [
    {
      title: "Zero-Waste Chef's Frittata & Casserole",
      time: "20 mins",
      difficulty: "Easy",
      prep: "Roughly chop cooked dishes, proteins, or side items.",
      steps: [
        "Warm prepared items in a large oven-safe skillet with a touch of oil.",
        "Pour over whisked eggs seasoned with salt and black pepper.",
        "Cook over medium heat until edges set, then transfer to a 190°C oven for 10-12 minutes.",
      ],
      preservation: "Slice into meal portions and blast chill to <4°C. Perfect for packaged takeaway.",
      yieldPerKg: "~4 nutritious portions per kg",
    },
  ],
  general: [
    {
      title: "Zero-Waste Flavor Base & Savory Reduction",
      time: "30 mins",
      difficulty: "Easy",
      prep: "Gather stock items, trim, and wash thoroughly.",
      steps: [
        "Caramelize items gently in oil to unlock deep Umami flavor compounds.",
        "Cover with cold filtered water and bring to a gentle simmer for 30-40 minutes.",
        "Strain solids and reduce liquid by half to create an intensely flavorful stock concentrate.",
      ],
      preservation: "Pour into silicone ice cube trays, freeze solid, and store cubes in bulk bags for up to 6 months.",
      yieldPerKg: "~1.5 liters rich reduction per kg",
    },
  ],
};

export default function RescueChefModal({ item, onClose }) {
  const [copied, setCopied] = useState(false);

  const recipes = useMemo(() => {
    if (!item) return [];
    const cat = (item.category || "general").toLowerCase();
    return CULINARY_RECIPES[cat] || CULINARY_RECIPES.general;
  }, [item]);

  if (!item) return null;

  const handleCopyRecipe = (recipe) => {
    const text = `👨‍🍳 RESCUE CHEF ZERO-WASTE RECIPE: ${recipe.title}
Target Ingredient: ${item.name} (${item.quantity} ${item.unit})
Prep: ${recipe.prep}
Instructions:
${recipe.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}
Preservation Technique: ${recipe.preservation}
Yield: ${recipe.yieldPerKg}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white border border-wheat-200 rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-wheat-200 bg-gradient-to-r from-forest-800 to-forest-700 text-wheat-50 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-xl bg-tomato-500 text-white shadow-sm shrink-0">
              <Sparkles className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <h2 className="font-display text-base sm:text-xl font-bold tracking-tight text-wheat-50 flex items-center gap-2">
                Rescue Chef &bull; Zero-Waste Recipes
              </h2>
              <p className="text-[11px] sm:text-xs text-wheat-100/70">
                AI Culinary Intelligence for <span className="font-semibold text-wheat-50">{item.name}</span> ({item.quantity} {item.unit})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-wheat-100/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 flex-1">
          {/* Quick Ingredient Card */}
          <div className="bg-wheat-50/70 border border-wheat-200 rounded-xl p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono uppercase text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded bg-forest-800 text-wheat-50">
                {item.category}
              </span>
              <span className="font-semibold text-forest-800 text-sm">{item.name}</span>
            </div>
            <div className="flex items-center gap-4 text-forest-800/70 font-mono">
              <span>Stock: <strong className="text-forest-800">{item.quantity} {item.unit}</strong></span>
              <span>Expires: <strong className="text-tomato-600">{item.expiry_date}</strong></span>
            </div>
          </div>

          {/* Recipes List */}
          <div className="space-y-4">
            {recipes.map((recipe, idx) => (
              <div
                key={idx}
                className="border border-wheat-200 rounded-xl p-5 bg-white shadow-2xs hover:border-forest-400/50 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-mono text-tomato-600 font-bold uppercase tracking-wider block mb-0.5">
                      Recipe {idx + 1}
                    </span>
                    <h3 className="font-display text-lg font-bold text-forest-800">
                      {recipe.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-wheat-100 text-forest-800/80">
                      <Clock className="w-3 h-3 text-forest-600" />
                      {recipe.time}
                    </span>
                    <button
                      onClick={() => handleCopyRecipe(recipe)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium border border-wheat-300 rounded-lg hover:bg-wheat-100 text-forest-800 transition-colors"
                      title="Copy Recipe"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-forest-600" /> : <Copy className="w-3.5 h-3.5 text-forest-600" />}
                      <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="text-xs text-forest-800/80 bg-wheat-50/50 rounded-lg p-2.5 border border-wheat-100 font-mono">
                  <strong className="text-forest-800">Preparation:</strong> {recipe.prep}
                </div>

                <div className="space-y-1.5 text-xs text-forest-800/80">
                  <p className="font-semibold text-forest-800 uppercase tracking-wide text-[10px] font-mono">
                    Cooking &amp; Batching Steps:
                  </p>
                  <ol className="space-y-1 list-decimal list-inside text-forest-800/80 leading-relaxed">
                    {recipe.steps.map((step, sIdx) => (
                      <li key={sIdx} className="pl-1">{step}</li>
                    ))}
                  </ol>
                </div>

                <div className="pt-2 border-t border-wheat-100 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-1.5 text-forest-800/70">
                    <ShieldCheck className="w-4 h-4 text-forest-600 shrink-0 mt-0.5" />
                    <span><strong className="text-forest-800">Preservation:</strong> {recipe.preservation}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-forest-800/70">
                    <Utensils className="w-4 h-4 text-tomato-500 shrink-0 mt-0.5" />
                    <span><strong className="text-forest-800">Est. Yield:</strong> {recipe.yieldPerKg}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-wheat-200 bg-wheat-50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-forest-800/60 text-center sm:text-left shrink-0">
          <span>💡 Zero-waste culinary algorithms prevent commercial kitchen spoilage.</span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-forest-800 text-wheat-50 rounded-lg font-semibold hover:bg-forest-700 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
