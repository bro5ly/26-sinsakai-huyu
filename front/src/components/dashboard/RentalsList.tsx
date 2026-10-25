import { Card, CardBody, Chip } from "@heroui/react";
import type { Rental } from "@sinsakai/shared";

interface RentalsListProps {
  rentals: Rental[];
  maxItems: number;
}

export const RentalsList = ({ rentals, maxItems }: RentalsListProps) => {
  return (
    <section className="px-6 mb-12">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <span className="text-[16px] font-black text-black uppercase tracking-widest">
          MyRentals
        </span>
        <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
          Limit: {maxItems} items
        </span>
      </div>

      {rentals && rentals.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {rentals.map((rental) => (
            <Card
              key={rental.id}
              className="border border-slate-100 shadow-none bg-white hover:bg-slate-50 transition-colors"
              radius="sm"
            >
              <CardBody className="p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 border border-slate-100">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    >
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <Chip
                    size="sm"
                    variant="flat"
                    color="primary"
                    className="text-[8px] font-black uppercase"
                  >
                    Active
                  </Chip>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                    {rental.itemType.genre.name}
                  </p>
                  <h3 className="font-bold text-[12px] text-slate-800 line-clamp-1 leading-none mb-2">
                    {rental.itemType.title}
                  </h3>
                  <p className="text-[10px] text-blue-500 font-bold tabular-nums">
                    ID: {rental.item.barcode}
                  </p>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl">
          <p className="text-xs text-slate-300 font-medium">
            No active rentals
          </p>
        </div>
      )}
    </section>
  );
};
