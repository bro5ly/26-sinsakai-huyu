import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Select,
  SelectItem,
  Badge,
} from "@heroui/react";
import { ItemGroup } from "@/types";

interface ItemsCatalogProps {
  items: ItemGroup[];
  categories: string[];
  genres: string[];
  searchQuery: string;
  genreFilter: string;
  categoryFilter: string;
  onSearchChange: (value: string) => void;
  onGenreFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
}

const FilterIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const ItemsCatalog = ({
  items,
  categories,
  genres,
  searchQuery,
  genreFilter,
  categoryFilter,
  onSearchChange,
  onGenreFilterChange,
  onCategoryFilterChange,
}: ItemsCatalogProps) => {
  const router = useRouter();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const handleResetFilters = () => {
    onGenreFilterChange("ALL");
    onCategoryFilterChange("ALL");
  };

  return (
    <section className="px-6">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <span className="text-[16px] font-black text-black uppercase tracking-widest">
          Storage
        </span>
        <div className="flex gap-2">
          <Input
            placeholder="Search..."
            value={searchQuery}
            onValueChange={onSearchChange}
            variant="flat"
            className="w-32"
            size="sm"
          />
          <Button
            isIconOnly
            variant="flat"
            size="sm"
            onPress={() => setIsFilterModalOpen(true)}
          >
            <FilterIcon />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {items.map((group) => (
          <Card
            key={group.itemType.title}
            isPressable
            className="border-none bg-white shadow-sm hover:bg-slate-50"
            onPress={() =>
              router.push(`/items/${encodeURIComponent(group.itemType.title)}`)
            }
          >
            <div className="aspect-square w-full bg-slate-50 relative border-b border-slate-100">
              {group.itemType.imageUrl ? (
                <img
                  src={group.itemType.imageUrl}
                  alt={group.itemType.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {/* Empty state - no content needed as per feature/add-ui */}
                </div>
              )}
              <div className="absolute top-2 right-2 z-10">
                <Badge
                  color={group.availableCount > 0 ? "success" : "danger"}
                  size="sm"
                >
                  {group.availableCount}
                </Badge>
              </div>
            </div>
            <div className="p-2">
              <h3 className="font-bold text-[10px] text-slate-800 line-clamp-1">
                {group.itemType.title}
              </h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        backdrop="blur"
        size="xs"
      >
        <ModalContent>
          <ModalHeader className="text-xs uppercase tracking-[0.2em] font-black">
            Filter Settings
          </ModalHeader>
          <ModalBody className="pb-8">
            <div className="space-y-4">
              <Select
                label="Category"
                variant="flat"
                size="sm"
                selectedKeys={categoryFilter === "ALL" ? [] : [categoryFilter]}
                onChange={(e) => onCategoryFilterChange(e.target.value || "ALL")}
              >
                {categories.map((cat) => (
                  <SelectItem key={cat} className="text-xs">
                    {cat}
                  </SelectItem>
                ))}
              </Select>
              <Select
                label="Genre"
                variant="flat"
                size="sm"
                selectedKeys={genreFilter === "ALL" ? [] : [genreFilter]}
                onChange={(e) => onGenreFilterChange(e.target.value || "ALL")}
              >
                {genres.map((gen) => (
                  <SelectItem key={gen} className="text-xs">
                    {gen}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </ModalBody>
          <ModalFooter className="border-t border-slate-100">
            <Button
              variant="light"
              size="sm"
              className="font-bold text-[10px] uppercase"
              onPress={handleResetFilters}
            >
              Reset
            </Button>
            <Button
              color="primary"
              size="sm"
              className="font-black text-[10px] uppercase"
              onPress={() => setIsFilterModalOpen(false)}
            >
              Apply
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </section>
  );
};
