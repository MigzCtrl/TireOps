const fs = require('fs');
const path = 'D:/Tire-Shop-MVP/src/app/work-orders/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add ChevronLeft, ChevronRight to imports
content = content.replace(
  "import { ClipboardList, Plus, Calendar, Clock, Trash2, Edit, Search, Eye, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Loader2, XCircle } from 'lucide-react';",
  "import { ClipboardList, Plus, Calendar, Clock, Trash2, Edit, Search, Eye, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Loader2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';"
);

// 2. Add ITEMS_PER_PAGE constant and currentPage state after sortDirection state
content = content.replace(
  `const [sortDirection, setSortDirection] = useState<SortDirection>('desc');`,
  `const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 25;`
);

// 3. Add effect to reset currentPage when filters change - after the sortedWorkOrders definition
const sortedWorkOrdersEnd = `  const stats = {
    total: workOrders.length,`;

content = content.replace(
  sortedWorkOrdersEnd,
  `  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, serviceTypeFilter, searchTerm, dateRangeFilter, sortField, sortDirection]);

  // Paginate sorted work orders
  const totalFilteredCount = sortedWorkOrders.length;
  const totalPages = Math.ceil(totalFilteredCount / ITEMS_PER_PAGE);
  const paginatedWorkOrders = sortedWorkOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = {
    total: workOrders.length,`
);

// 4. Replace sortedWorkOrders.length with paginatedWorkOrders in the table rendering
content = content.replace(
  '{sortedWorkOrders.length === 0 ? (',
  '{paginatedWorkOrders.length === 0 ? ('
);

content = content.replace(
  '{sortedWorkOrders.map((order, index) => (',
  '{paginatedWorkOrders.map((order, index) => ('
);

// 5. Add pagination UI after the table
const tableEndOld = `            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}`;

const tableEndNew = `            </div>
          )}

          {/* Pagination Controls */}
          {totalFilteredCount > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-muted">
              <div className="text-sm text-text-muted">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalFilteredCount)} of {totalFilteredCount} orders
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                <span className="text-sm text-text-muted px-3">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}`;

content = content.replace(tableEndOld, tableEndNew);

fs.writeFileSync(path, content);
console.log('Work orders pagination added successfully!');
