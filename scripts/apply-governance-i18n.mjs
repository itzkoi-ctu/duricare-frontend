import fs from 'node:fs';

const viPath = 'E:/CTU/LuanVan/duricare-frontend/src/i18n/locales/vi/translation.json';
const enPath = 'E:/CTU/LuanVan/duricare-frontend/src/i18n/locales/en/translation.json';

const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const dictionary = {
  // Navigation & Page titles
  'Nguồn tri thức nông nghiệp': {
    vi: 'Nguồn tri thức nông nghiệp',
    en: 'Agricultural Knowledge Sources'
  },
  'Nguồn tri thức': {
    vi: 'Nguồn tri thức',
    en: 'Knowledge Sources'
  },
  'Tri thức': {
    vi: 'Tri thức',
    en: 'Knowledge'
  },
  'Quản lý hồ sơ tài liệu, trích đoạn kỹ thuật canh tác và quy trình thẩm định chuyên môn.': {
    vi: 'Quản lý hồ sơ tài liệu, trích đoạn kỹ thuật canh tác và quy trình thẩm định chuyên môn.',
    en: 'Manage source publications, farming practice excerpts, and professional review workflows.'
  },
  'Tạo nguồn tri thức mới': {
    vi: 'Tạo nguồn tri thức mới',
    en: 'Create New Knowledge Source'
  },
  'Tạo mới nguồn tri thức': {
    vi: 'Tạo mới nguồn tri thức',
    en: 'Create New Knowledge Source'
  },
  'Chi tiết nguồn tri thức': {
    vi: 'Chi tiết nguồn tri thức',
    en: 'Knowledge Source Details'
  },
  'Chỉnh sửa bản nháp': {
    vi: 'Chỉnh sửa bản nháp',
    en: 'Edit Draft'
  },
  'Xem chi tiết hồ sơ nguồn': {
    vi: 'Xem chi tiết hồ sơ nguồn',
    en: 'View Knowledge Source Details'
  },
  'Quay lại danh sách nguồn': {
    vi: 'Quay lại danh sách nguồn',
    en: 'Back to Knowledge Sources'
  },
  'Quay lại chi tiết nguồn': {
    vi: 'Quay lại chi tiết nguồn',
    en: 'Back to Source Details'
  },
  'Quay lại danh sách': {
    vi: 'Quay lại danh sách',
    en: 'Back to List'
  },

  // Notices & Restrictions
  'Tài khoản của bạn đang chờ quản trị viên xác minh.': {
    vi: 'Tài khoản của bạn đang chờ quản trị viên xác minh.',
    en: 'Your account is pending administrator verification.'
  },
  'Quyền chuyên môn của tài khoản đang tạm đình chỉ.': {
    vi: 'Quyền chuyên môn của tài khoản đang tạm đình chỉ.',
    en: 'Your account professional privileges are currently suspended.'
  },
  'Bạn có thể xem các nguồn tri thức đã đóng góp trước đây ở chế độ chỉ đọc. Chức năng tạo nguồn mới và sửa bản nháp sẽ mở lại khi hồ sơ ở trạng thái Đã xác minh.': {
    vi: 'Bạn có thể xem các nguồn tri thức đã đóng góp trước đây ở chế độ chỉ đọc. Chức năng tạo nguồn mới và sửa bản nháp sẽ mở lại khi hồ sơ ở trạng thái Đã xác minh.',
    en: 'You can view previously contributed knowledge sources in read-only mode. Creating new sources and editing drafts will be enabled once your profile is Verified.'
  },
  'Chức năng tri thức tạm thời chưa sẵn sàng (503)': {
    vi: 'Chức năng tri thức tạm thời chưa sẵn sàng (503)',
    en: 'Knowledge governance is temporarily unavailable (503)'
  },
  'Hệ thống cơ sở dữ liệu quản trị tri thức đang trong quá trình nâng cấp. Vui lòng quay lại sau.': {
    vi: 'Hệ thống cơ sở dữ liệu quản trị tri thức đang trong quá trình nâng cấp. Vui lòng quay lại sau.',
    en: 'Knowledge governance database schema is currently undergoing upgrade. Please check back later.'
  },
  'Tài khoản đã xác minh. Bạn có thể tạo hồ sơ tài liệu mới, quản lý các bản nháp trích đoạn kỹ thuật và theo dõi lịch sử kiểm toán.': {
    vi: 'Tài khoản đã xác minh. Bạn có thể tạo hồ sơ tài liệu mới, quản lý các bản nháp trích đoạn kỹ thuật và theo dõi lịch sử kiểm toán.',
    en: 'Account is verified. You can create new publications, manage technical excerpt drafts, and review audit history.'
  },
  'Bạn có thể xem các hồ sơ nguồn tri thức của mình ở chế độ chỉ đọc.': {
    vi: 'Bạn có thể xem các hồ sơ nguồn tri thức của mình ở chế độ chỉ đọc.',
    en: 'You can view your knowledge sources in read-only mode.'
  },
  'Xem nguồn tri thức': {
    vi: 'Xem nguồn tri thức',
    en: 'View Knowledge Sources'
  },
  'Tạo nguồn mới': {
    vi: 'Tạo nguồn mới',
    en: 'Create Source'
  },

  // Statuses & Filters
  'Tất cả': {
    vi: 'Tất cả',
    en: 'All'
  },
  'Bản nháp': {
    vi: 'Bản nháp',
    en: 'Draft'
  },
  'Đã gửi thẩm định': {
    vi: 'Đã gửi thẩm định',
    en: 'Submitted'
  },
  'Đã gửi': {
    vi: 'Đã gửi',
    en: 'Submitted'
  },
  'Đang thẩm định': {
    vi: 'Đang thẩm định',
    en: 'In Review'
  },
  'Yêu cầu sửa đổi': {
    vi: 'Yêu cầu sửa đổi',
    en: 'Changes Requested'
  },
  'Đã phê duyệt': {
    vi: 'Đã phê duyệt',
    en: 'Approved'
  },
  'Từ chối': {
    vi: 'Từ chối',
    en: 'Rejected'
  },
  'Đã rút': {
    vi: 'Đã rút',
    en: 'Withdrawn'
  },

  // Status descriptions
  'Hồ sơ đang trong quá trình soạn thảo, chưa gửi thẩm định.': {
    vi: 'Hồ sơ đang trong quá trình soạn thảo, chưa gửi thẩm định.',
    en: 'Source record is in drafting stage and has not been submitted for review.'
  },
  'Hồ sơ đã được gửi và đang chờ quản trị viên phân công chuyên gia thẩm định.': {
    vi: 'Hồ sơ đã được gửi và đang chờ quản trị viên phân công chuyên gia thẩm định.',
    en: 'Source record has been submitted and is awaiting administrator assignment to an expert reviewer.'
  },
  'Chuyên gia được phân công đang tiến hành đánh giá và thẩm định hồ sơ.': {
    vi: 'Chuyên gia được phân công đang tiến hành đánh giá và thẩm định hồ sơ.',
    en: 'Assigned expert reviewer is actively evaluating the source revision.'
  },
  'Người thẩm định yêu cầu tác giả điều chỉnh hoặc bổ sung căn cứ cho hồ sơ.': {
    vi: 'Người thẩm định yêu cầu tác giả điều chỉnh hoặc bổ sung căn cứ cho hồ sơ.',
    en: 'Reviewer has requested revisions or additional evidence before reconsideration.'
  },
  'Hồ sơ nguồn đã được thẩm định đạt tiêu chuẩn chuyên môn.': {
    vi: 'Hồ sơ nguồn đã được thẩm định đạt tiêu chuẩn chuyên môn.',
    en: 'Source record has been approved by the expert reviewer.'
  },
  'Hồ sơ không đạt yêu cầu thẩm định chuyên môn.': {
    vi: 'Hồ sơ không đạt yêu cầu thẩm định chuyên môn.',
    en: 'Source record was rejected by the reviewer.'
  },
  'Tác giả đã chủ động rút hồ sơ này.': {
    vi: 'Tác giả đã chủ động rút hồ sơ này.',
    en: 'Author has withdrawn this submission.'
  },

  // Source types
  'Văn bản chính thức': {
    vi: 'Văn bản chính thức',
    en: 'Official Document'
  },
  'Nghiên cứu khoa học': {
    vi: 'Nghiên cứu khoa học',
    en: 'Research Publication'
  },
  'Hướng dẫn kỹ thuật viện nghiên cứu': {
    vi: 'Hướng dẫn kỹ thuật viện nghiên cứu',
    en: 'Research Institute Guide'
  },
  'Quy trình HTX / tổ chức sản xuất': {
    vi: 'Quy trình HTX / tổ chức sản xuất',
    en: 'Cooperative / Farm Group Manual'
  },
  'Tài liệu thương mại / nhà cung cấp': {
    vi: 'Tài liệu thương mại / nhà cung cấp',
    en: 'Commercial Supplier Guide'
  },
  'Kinh nghiệm / phỏng vấn thực địa': {
    vi: 'Kinh nghiệm / phỏng vấn thực địa',
    en: 'Field Experience / Interview'
  },
  'Khác': {
    vi: 'Khác',
    en: 'Other'
  },

  // Topics
  'Tưới nước & quản lý ẩm': {
    vi: 'Tưới nước & quản lý ẩm',
    en: 'Irrigation & Moisture Management'
  },
  'Dinh dưỡng & bón phân': {
    vi: 'Dinh dưỡng & bón phân',
    en: 'Nutrition & Fertilization'
  },
  'Tổng quát & canh tác': {
    vi: 'Tổng quát & canh tác',
    en: 'General & Crop Husbandry'
  },

  // Growth stages
  'Kiến thiết cơ bản (0 - 4 năm)': {
    vi: 'Kiến thiết cơ bản (0 - 4 năm)',
    en: 'Vegetative Establishment (0 - 4 years)'
  },
  'Xiết nước (tạo mầm hoa)': {
    vi: 'Xiết nước (tạo mầm hoa)',
    en: 'Water Stress (Floral Induction)'
  },
  'Ra hoa (mầm hoa đến nở)': {
    vi: 'Ra hoa (mầm hoa đến nở)',
    en: 'Flowering (Buds to Anthesis)'
  },
  'Đậu trái (0 - 30 ngày)': {
    vi: 'Đậu trái (0 - 30 ngày)',
    en: 'Fruit Set (0 - 30 days)'
  },
  'Phát triển trái (tạo cơm)': {
    vi: 'Phát triển trái (tạo cơm)',
    en: 'Fruit Growth (Pulp Filling)'
  },
  'Trước thu hoạch': {
    vi: 'Trước thu hoạch',
    en: 'Pre-harvest'
  },
  'Chín & thu hoạch': {
    vi: 'Chín & thu hoạch',
    en: 'Ripe & Harvest'
  },
  'Tất cả các giai đoạn / Áp dụng chung': {
    vi: 'Tất cả các giai đoạn / Áp dụng chung',
    en: 'All Growth Stages / General'
  },
  'Áp dụng chung': {
    vi: 'Áp dụng chung',
    en: 'General Application'
  },

  // Tiers
  'Tầng A': {
    vi: 'Tầng A',
    en: 'Tier A'
  },
  'Tầng B': {
    vi: 'Tầng B',
    en: 'Tier B'
  },
  'Tầng C': {
    vi: 'Tầng C',
    en: 'Tier C'
  },
  'Tầng D': {
    vi: 'Tầng D',
    en: 'Tier D'
  },
  'Tầng E': {
    vi: 'Tầng E',
    en: 'Tier E'
  },
  'Chưa phân tầng': {
    vi: 'Chưa phân tầng',
    en: 'Unassigned Tier'
  },
  'Văn bản cơ quan chuyên ngành / Nghiên cứu khoa học thẩm định': {
    vi: 'Văn bản cơ quan chuyên ngành / Nghiên cứu khoa học thẩm định',
    en: 'Official specialist agency document / Peer-reviewed study'
  },
  'Hướng dẫn kỹ thuật viện nghiên cứu / khuyến nông': {
    vi: 'Hướng dẫn kỹ thuật viện nghiên cứu / khuyến nông',
    en: 'Research institute or extension service technical guide'
  },
  'Quy trình hợp tác xã / tổ chức sản xuất có hồ sơ': {
    vi: 'Quy trình hợp tác xã / tổ chức sản xuất có hồ sơ',
    en: 'Documented cooperative or farming collective protocol'
  },
  'Tài liệu thương mại / nhà cung cấp có xuất xứ': {
    vi: 'Tài liệu thương mại / nhà cung cấp có xuất xứ',
    en: 'Commercial supplier document with declared provenance'
  },
  'Kinh nghiệm / phỏng vấn thực địa có biên bản': {
    vi: 'Kinh nghiệm / phỏng vấn thực địa có biên bản',
    en: 'Documented field interview or practical experience'
  },
  'Chưa đủ bằng chứng xếp hạng, chờ reviewer thẩm định': {
    vi: 'Chưa đủ bằng chứng xếp hạng, chờ reviewer thẩm định',
    en: 'Insufficient classification evidence; pending reviewer assessment'
  },

  // Metadata form labels & helpers
  'Thông tin nguồn tài liệu': {
    vi: 'Thông tin nguồn tài liệu',
    en: 'Source Publication Information'
  },
  'Khai báo nguồn xuất bản, tác giả, loại tài liệu và đề xuất tầng chất lượng căn cứ.': {
    vi: 'Khai báo nguồn xuất bản, tác giả, loại tài liệu và đề xuất tầng chất lượng căn cứ.',
    en: 'Specify publication metadata, authors, document type, and evidence-backed proposed quality tier.'
  },
  'Tiêu đề tài liệu / Nguồn tri thức': {
    vi: 'Tiêu đề tài liệu / Nguồn tri thức',
    en: 'Document Title / Knowledge Source'
  },
  'Ví dụ: Quy trình kỹ thuật quản lý nước và bón phân sầu riêng...': {
    vi: 'Ví dụ: Quy trình kỹ thuật quản lý nước và bón phân sầu riêng...',
    en: 'e.g. Technical guidelines for durian water management and fertilisation...'
  },
  'Tác giả / Nhóm biên soạn': {
    vi: 'Tác giả / Nhóm biên soạn',
    en: 'Authors / Editorial Team'
  },
  'Ví dụ: GS.TS Trần Văn A, Viện Cây ăn quả Miền Nam...': {
    vi: 'Ví dụ: GS.TS Trần Văn A, Viện Cây ăn quả Miền Nam...',
    en: 'e.g. Prof. Dr. Tran Van A, Southern Fruit Research Institute...'
  },
  'Đơn vị xuất bản / Cơ quan phát hành': {
    vi: 'Đơn vị xuất bản / Cơ quan phát hành',
    en: 'Publisher / Issuing Organization'
  },
  'Ví dụ: NXB Nông Nghiệp, Trung tâm Khuyến nông Quốc gia...': {
    vi: 'Ví dụ: NXB Nông Nghiệp, Trung tâm Khuyến nông Quốc gia...',
    en: 'e.g. Agriculture Publishing House, National Agricultural Extension Center...'
  },
  'Loại nguồn': {
    vi: 'Loại nguồn',
    en: 'Source Type'
  },
  'Năm xuất bản (1000 - ': {
    vi: 'Năm xuất bản (1000 - ',
    en: 'Publication year (1000 - '
  },
  'Ví dụ: 2024 (để trống nếu không rõ)': {
    vi: 'Ví dụ: 2024 (để trống nếu không rõ)',
    en: 'e.g. 2024 (leave blank if unknown)'
  },
  'Tái bản / Phiên bản ấn phẩm': {
    vi: 'Tái bản / Phiên bản ấn phẩm',
    en: 'Edition / Publication Version'
  },
  'Ví dụ: Tái bản lần 2, Ấn bản sửa đổi 2023...': {
    vi: 'Ví dụ: Tái bản lần 2, Ấn bản sửa đổi 2023...',
    en: 'e.g. 2nd edition, revised version 2023...'
  },
  'Đường dẫn trực tuyến (URL HTTP/HTTPS)': {
    vi: 'Đường dẫn trực tuyến (URL HTTP/HTTPS)',
    en: 'Online Link (HTTP/HTTPS URL)'
  },
  'Căn cứ trích dẫn / Lưu trữ hiện vật / Hồ sơ': {
    vi: 'Căn cứ trích dẫn / Lưu trữ hiện vật / Hồ sơ',
    en: 'Citation Reference / Archive / Record'
  },
  'Ví dụ: Bản lưu thư viện ĐH Cần Thơ, mã tài liệu CTU-2023-SR01...': {
    vi: 'Ví dụ: Bản lưu thư viện ĐH Cần Thơ, mã tài liệu CTU-2023-SR01...',
    en: 'e.g. Can Tho University Library Archive, Ref: CTU-2023-SR01...'
  },
  'Ghi chú xuất xứ & phương pháp thu thập': {
    vi: 'Ghi chú xuất xứ & phương pháp thu thập',
    en: 'Provenance Notes & Methodology'
  },
  'Ghi chú hoàn cảnh thu thập, biên bản phỏng vấn hoặc phương pháp kiểm tra đối chiếu...': {
    vi: 'Ghi chú hoàn cảnh thu thập, biên bản phỏng vấn hoặc phương pháp kiểm tra đối chiếu...',
    en: 'Notes on collection context, interview protocols, or cross-referencing methods...'
  },
  'Đề xuất tầng chất lượng': {
    vi: 'Đề xuất tầng chất lượng',
    en: 'Proposed Quality Tier'
  },
  'Căn cứ đề xuất tầng tri thức': {
    vi: 'Căn cứ đề xuất tầng tri thức',
    en: 'Proposed Tier Rationale'
  },
  'Nêu rõ xuất xứ, quy trình thẩm định hoặc hồ sơ kiểm chứng để đề xuất tầng chất lượng tương ứng...': {
    vi: 'Nêu rõ xuất xứ, quy trình thẩm định hoặc hồ sơ kiểm chứng để đề xuất tầng chất lượng tương ứng...',
    en: 'Specify provenance, review methodology, or verification records justifying the proposed tier...'
  },

  // Chunk Editor
  'Các đoạn kiến thức trích đoạn (Chunks)': {
    vi: 'Các đoạn kiến thức trích đoạn (Chunks)',
    en: 'Knowledge Excerpt Chunks'
  },
  'Chia nhỏ nội dung tài liệu thành tối đa 20 đoạn trích có định vị và điều kiện áp dụng.': {
    vi: 'Chia nhỏ nội dung tài liệu thành tối đa 20 đoạn trích có định vị và điều kiện áp dụng.',
    en: 'Break down publication contents into up to 20 excerpt chunks with locators and application conditions.'
  },
  'Thêm đoạn trích': {
    vi: 'Thêm đoạn trích',
    en: 'Add Excerpt'
  },
  'Chưa có đoạn kiến thức nào. Bạn có thể lưu bản nháp không có đoạn trích hoặc thêm đoạn mới.': {
    vi: 'Chưa có đoạn kiến thức nào. Bạn có thể lưu bản nháp không có đoạn trích hoặc thêm đoạn mới.',
    en: 'No knowledge chunks yet. You can save an empty draft or add your first excerpt chunk.'
  },
  'Thêm đoạn đầu tiên': {
    vi: 'Thêm đoạn đầu tiên',
    en: 'Add First Chunk'
  },
  'Đoạn kiến thức': {
    vi: 'Đoạn kiến thức',
    en: 'Knowledge Chunk'
  },
  'Di chuyển lên': {
    vi: 'Di chuyển lên',
    en: 'Move Up'
  },
  'Di chuyển xuống': {
    vi: 'Di chuyển xuống',
    en: 'Move Down'
  },
  'Xóa đoạn này': {
    vi: 'Xóa đoạn này',
    en: 'Delete Chunk'
  },
  'Tiêu đề đoạn trích': {
    vi: 'Tiêu đề đoạn trích',
    en: 'Chunk Title'
  },
  'Ví dụ: Định mức tưới giai đoạn xiết nước...': {
    vi: 'Ví dụ: Định mức tưới giai đoạn xiết nước...',
    en: 'e.g. Irrigation quota during water stress stage...'
  },
  'Chủ đề': {
    vi: 'Chủ đề',
    en: 'Topic'
  },
  'Giai đoạn sinh trưởng áp dụng': {
    vi: 'Giai đoạn sinh trưởng áp dụng',
    en: 'Target Growth Stage'
  },
  'Vị trí trích đoạn trong tài liệu (Locator)': {
    vi: 'Vị trí trích đoạn trong tài liệu (Locator)',
    en: 'Document Excerpt Locator'
  },
  'Ví dụ: Trang 34, Bảng 2.1, Mục 4.2.3...': {
    vi: 'Ví dụ: Trang 34, Bảng 2.1, Mục 4.2.3...',
    en: 'e.g. Page 34, Table 2.1, Section 4.2.3...'
  },
  'Văn bản trích đoạn nguyên gốc (Original Excerpt)': {
    vi: 'Văn bản trích đoạn nguyên gốc (Original Excerpt)',
    en: 'Original Excerpt Text'
  },
  'Đoạn văn trích dẫn nguyên văn từ tài liệu nguồn...': {
    vi: 'Đoạn văn trích dẫn nguyên văn từ tài liệu nguồn...',
    en: 'Verbatim excerpt quoted directly from the source publication...'
  },
  'Nội dung chuẩn hóa / Hướng dẫn trích xuất (Content)': {
    vi: 'Nội dung chuẩn hóa / Hướng dẫn trích xuất (Content)',
    en: 'Standardized Guidance / Extracted Knowledge'
  },
  'Nội dung khuyến nghị kỹ thuật đã chuẩn hóa phục vụ tra cứu...': {
    vi: 'Nội dung khuyến nghị kỹ thuật đã chuẩn hóa phục vụ tra cứu...',
    en: 'Standardized technical recommendation for search and assessment...'
  },
  'Ghi chú phạm vi áp dụng (Đất, giống, vùng...)': {
    vi: 'Ghi chú phạm vi áp dụng (Đất, giống, vùng...)',
    en: 'Applicability Notes (Soil, Cultivar, Region...)'
  },
  'Áp dụng cho giống Ri6, Monthong, đất phù sa ĐBSCL...': {
    vi: 'Áp dụng cho giống Ri6, Monthong, đất phù sa ĐBSCL...',
    en: 'Applies to Ri6, Monthong cultivars, alluvial soil in Mekong Delta...'
  },
  'Ghi chú phương pháp & đơn vị đo lường': {
    vi: 'Ghi chú phương pháp & đơn vị đo lường',
    en: 'Measurement Methodology & Units'
  },
  'Đo bằng cảm biến điện dung, độ ẩm thể tích m3/m3 hoặc %...': {
    vi: 'Đo bằng cảm biến điện dung, độ ẩm thể tích m3/m3 hoặc %...',
    en: 'Measured by capacitance sensors, volumetric water content m3/m3 or %...'
  },

  // Table & Listing
  'Tiêu đề tài liệu nguồn': {
    vi: 'Tiêu đề tài liệu nguồn',
    en: 'Source Document Title'
  },
  'Người tạo': {
    vi: 'Người tạo',
    en: 'Contributor'
  },
  'Chưa có tiêu đề': {
    vi: 'Chưa có tiêu đề',
    en: 'Untitled Document'
  },
  'Chi tiết': {
    vi: 'Chi tiết',
    en: 'Details'
  },
  'Tổng số': {
    vi: 'Tổng số',
    en: 'Total'
  },
  'nguồn tri thức': {
    vi: 'nguồn tri thức',
    en: 'knowledge sources'
  },
  'Không có nguồn tri thức nào': {
    vi: 'Không có nguồn tri thức nào',
    en: 'No Knowledge Sources Found'
  },
  'Không tìm thấy nguồn tri thức nào ở trạng thái này.': {
    vi: 'Không tìm thấy nguồn tri thức nào ở trạng thái này.',
    en: 'No knowledge sources found matching this status filter.'
  },
  'Chưa có hồ sơ nguồn tri thức nào trong hệ thống.': {
    vi: 'Chưa có hồ sơ nguồn tri thức nào trong hệ thống.',
    en: 'No knowledge source records exist in the system yet.'
  },
  'Tạo nguồn tri thức đầu tiên': {
    vi: 'Tạo nguồn tri thức đầu tiên',
    en: 'Create First Source'
  },

  // History & Audit
  'Đang tải lịch sử kiểm toán...': {
    vi: 'Đang tải lịch sử kiểm toán...',
    en: 'Loading audit history...'
  },
  'Chưa có bản ghi kiểm toán nào.': {
    vi: 'Chưa có bản ghi kiểm toán nào.',
    en: 'No audit records found.'
  },
  'Thời gian': {
    vi: 'Thời gian',
    en: 'Timestamp'
  },
  'Người thực hiện': {
    vi: 'Người thực hiện',
    en: 'Actor'
  },
  'Hành động': {
    vi: 'Hành động',
    en: 'Action'
  },
  'Chuyển trạng thái': {
    vi: 'Chuyển trạng thái',
    en: 'Status Transition'
  },
  'Lý do / Ghi chú': {
    vi: 'Lý do / Ghi chú',
    en: 'Reason / Notes'
  },
  'Tạo nguồn tri thức': {
    vi: 'Tạo nguồn tri thức',
    en: 'Source Created'
  },
  'Lưu bản nháp': {
    vi: 'Lưu bản nháp',
    en: 'Draft Saved'
  },
  'Tạo phiên bản mới': {
    vi: 'Tạo phiên bản mới',
    en: 'Revision Created'
  },
  'Gửi thẩm định': {
    vi: 'Gửi thẩm định',
    en: 'Submitted for Review'
  },
  'Rút hồ sơ': {
    vi: 'Rút hồ sơ',
    en: 'Withdrawn'
  },
  'Phân công thẩm định': {
    vi: 'Phân công thẩm định',
    en: 'Reviewer Assigned'
  },
  'Phân công lại': {
    vi: 'Phân công lại',
    en: 'Reviewer Reassigned'
  },
  'Có quyết định thẩm định': {
    vi: 'Có quyết định thẩm định',
    en: 'Review Decided'
  },
  'sự kiện': {
    vi: 'sự kiện',
    en: 'events'
  },
  'Trước': {
    vi: 'Trước',
    en: 'Previous'
  },
  'Sau': {
    vi: 'Sau',
    en: 'Next'
  },

  // Detail & Edit Page
  'Thông tin xuất bản & Xuất xứ': {
    vi: 'Thông tin xuất bản & Xuất xứ',
    en: 'Publication Metadata & Provenance'
  },
  'Thông tin xuất bản': {
    vi: 'Thông tin xuất bản',
    en: 'Publication Information'
  },
  'Tác giả': {
    vi: 'Tác giả',
    en: 'Authors'
  },
  'Đơn vị xuất bản': {
    vi: 'Đơn vị xuất bản',
    en: 'Publisher'
  },
  'Năm xuất bản': {
    vi: 'Năm xuất bản',
    en: 'Publication Year'
  },
  'Phiên bản ấn phẩm': {
    vi: 'Phiên bản ấn phẩm',
    en: 'Edition'
  },
  'Thời gian tạo': {
    vi: 'Thời gian tạo',
    en: 'Created At'
  },
  'Đường dẫn trực tuyến': {
    vi: 'Đường dẫn trực tuyến',
    en: 'Online Link'
  },
  'Căn cứ trích dẫn / Lưu trữ hiện vật': {
    vi: 'Căn cứ trích dẫn / Lưu trữ hiện vật',
    en: 'Citation Reference / Archive Record'
  },
  'Căn cứ đề xuất': {
    vi: 'Căn cứ đề xuất',
    en: 'Proposed Rationale'
  },
  'Tầng thẩm định được duyệt': {
    vi: 'Tầng thẩm định được duyệt',
    en: 'Assessed Approved Tier'
  },
  'Đánh giá của thẩm định viên': {
    vi: 'Đánh giá của thẩm định viên',
    en: 'Reviewer Assessment Rationale'
  },
  'Các đoạn trích kiến thức': {
    vi: 'Các đoạn trích kiến thức',
    en: 'Knowledge Chunks'
  },
  'Lịch sử kiểm toán': {
    vi: 'Lịch sử kiểm toán',
    en: 'Audit History'
  },
  'Bản nháp này chưa có đoạn trích kiến thức nào.': {
    vi: 'Bản nháp này chưa có đoạn trích kiến thức nào.',
    en: 'This draft does not have any excerpt chunks yet.'
  },
  'Trích đoạn nguyên văn': {
    vi: 'Trích đoạn nguyên văn',
    en: 'Original Excerpt'
  },
  'Nội dung chuẩn hóa / Hướng dẫn': {
    vi: 'Nội dung chuẩn hóa / Hướng dẫn',
    en: 'Standardized Guidance'
  },
  'Phạm vi áp dụng': {
    vi: 'Phạm vi áp dụng',
    en: 'Applicability Scope'
  },
  'Ghi chú đo lường': {
    vi: 'Ghi chú đo lường',
    en: 'Measurement Notes'
  },
  'Tải lại dữ liệu': {
    vi: 'Tải lại dữ liệu',
    en: 'Reload Data'
  },
  'Không tìm thấy nguồn tri thức': {
    vi: 'Không tìm thấy nguồn tri thức',
    en: 'Knowledge Source Not Found'
  },
  'Hồ sơ không tồn tại hoặc bạn không có quyền truy cập vào nguồn tri thức này.': {
    vi: 'Hồ sơ không tồn tại hoặc bạn không có quyền truy cập vào nguồn tri thức này.',
    en: 'The source record does not exist or you do not have permission to access it.'
  },
  'Không thể tải thông tin nguồn tri thức.': {
    vi: 'Không thể tải thông tin nguồn tri thức.',
    en: 'Unable to load knowledge source information.'
  },

  // Actions & Form confirmation
  'Hồ sơ ban đầu sẽ được tạo ở trạng thái Bản nháp (DRAFT) để bạn hoàn thiện trước khi gửi thẩm định.': {
    vi: 'Hồ sơ ban đầu sẽ được tạo ở trạng thái Bản nháp (DRAFT) để bạn hoàn thiện trước khi gửi thẩm định.',
    en: 'The initial record will be created as a Draft (DRAFT) for you to refine before submitting for review.'
  },
  'Đang lưu bản nháp...': {
    vi: 'Đang lưu bản nháp...',
    en: 'Saving draft...'
  },
  'Lưu tạo bản nháp': {
    vi: 'Lưu tạo bản nháp',
    en: 'Save Draft'
  },
  'Lưu thay đổi': {
    vi: 'Lưu thay đổi',
    en: 'Save Changes'
  },
  'Tạo nguồn tri thức mới thành công!': {
    vi: 'Tạo nguồn tri thức mới thành công!',
    en: 'Knowledge source created successfully!'
  },
  'Lưu bản nháp thành công! (v{0})': {
    vi: 'Lưu bản nháp thành công! (v{0})',
    en: 'Draft saved successfully! (v{0})'
  },
  'Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời đi?': {
    vi: 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời đi?',
    en: 'You have unsaved changes. Are you sure you want to leave?'
  },
  'Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?': {
    vi: 'Bạn có thay đổi chưa lưu. Bạn có chắc muốn hủy?',
    en: 'You have unsaved changes. Are you sure you want to discard them?'
  },
  'Vui lòng kiểm tra và sửa các lỗi trên biểu mẫu.': {
    vi: 'Vui lòng kiểm tra và sửa các lỗi trên biểu mẫu.',
    en: 'Please check and correct the errors on the form.'
  },
  'Chỉ có thể chỉnh sửa hồ sơ ở trạng thái Bản nháp (DRAFT)': {
    vi: 'Chỉ có thể chỉnh sửa hồ sơ ở trạng thái Bản nháp (DRAFT)',
    en: 'Only records in Draft (DRAFT) status can be edited'
  },
  'Phiên bản này hiện đang ở trạng thái "{0}" và nội dung đã được chốt snapshot bất biến để phục vụ quy trình thẩm định.': {
    vi: 'Phiên bản này hiện đang ở trạng thái "{0}" và nội dung đã được chốt snapshot bất biến để phục vụ quy trình thẩm định.',
    en: 'This revision is currently in "{0}" status and its content is locked as an immutable snapshot for the review process.'
  },
  'Cập nhật thông tin tài liệu và danh sách đoạn trích. Sử dụng cơ chế khóa lạc quan (optimistic locking) để tránh ghi đè dữ liệu.': {
    vi: 'Cập nhật thông tin tài liệu và danh sách đoạn trích. Sử dụng cơ chế khóa lạc quan (optimistic locking) để tránh ghi đè dữ liệu.',
    en: 'Update publication metadata and excerpt chunks. Employs optimistic locking to prevent concurrent overwrite.'
  },
  'Xung đột phiên bản (409 Conflict)': {
    vi: 'Xung đột phiên bản (409 Conflict)',
    en: 'Version Conflict (409 Conflict)'
  },
  'Hồ sơ đã được cập nhật bởi một phiên làm việc khác. Dữ liệu bạn vừa nhập đã được giữ lại trên màn hình. Vui lòng nhấn "Tải lại và cập nhật phiên bản" bên dưới trước khi lưu tiếp.': {
    vi: 'Hồ sơ đã được cập nhật bởi một phiên làm việc khác. Dữ liệu bạn vừa nhập đã được giữ lại trên màn hình. Vui lòng nhấn "Tải lại và cập nhật phiên bản" bên dưới trước khi lưu tiếp.',
    en: 'The record was modified by another session. Your unsaved input has been preserved. Please click "Reload & update version" below before saving again.'
  },
  'Tải lại và cập nhật phiên bản': {
    vi: 'Tải lại và cập nhật phiên bản',
    en: 'Reload & Update Version'
  },
  'Đã tải lại phiên bản mới nhất từ máy chủ (v{0}). Bạn có thể tiếp tục chỉnh sửa.': {
    vi: 'Đã tải lại phiên bản mới nhất từ máy chủ (v{0}). Bạn có thể tiếp tục chỉnh sửa.',
    en: 'Reloaded latest version from server (v{0}). You may proceed with editing.'
  },
  'Không tìm thấy thông tin phiên bản.': {
    vi: 'Không tìm thấy thông tin phiên bản.',
    en: 'Revision information not found.'
  },

  // Validation error strings
  'Vui lòng nhập tiêu đề tài liệu nguồn.': {
    vi: 'Vui lòng nhập tiêu đề tài liệu nguồn.',
    en: 'Please enter source publication title.'
  },
  'Tiêu đề tối đa 300 ký tự.': {
    vi: 'Tiêu đề tối đa 300 ký tự.',
    en: 'Title must be at most 300 characters.'
  },
  'Tác giả tối đa 1000 ký tự.': {
    vi: 'Tác giả tối đa 1000 ký tự.',
    en: 'Authors must be at most 1000 characters.'
  },
  'Đơn vị xuất bản tối đa 300 ký tự.': {
    vi: 'Đơn vị xuất bản tối đa 300 ký tự.',
    en: 'Publisher must be at most 300 characters.'
  },
  'URL không hợp lệ. Vui lòng nhập đúng định dạng https://...': {
    vi: 'URL không hợp lệ. Vui lòng nhập đúng định dạng https://...',
    en: 'Invalid URL. Please enter a valid https://... link.'
  },
  'Chỉ chấp nhận URL HTTP(S) tuyệt đối.': {
    vi: 'Chỉ chấp nhận URL HTTP(S) tuyệt đối.',
    en: 'Only absolute HTTP(S) URLs are accepted.'
  },
  'Vui lòng nêu căn cứ đề xuất tầng tri thức.': {
    vi: 'Vui lòng nêu căn cứ đề xuất tầng tri thức.',
    en: 'Please provide rationale for the proposed quality tier.'
  },
  'Tối đa 20 đoạn kiến thức.': {
    vi: 'Tối đa 20 đoạn kiến thức.',
    en: 'Maximum 20 knowledge chunks allowed.'
  },
  'Vui lòng nhập tiêu đề đoạn trích.': {
    vi: 'Vui lòng nhập tiêu đề đoạn trích.',
    en: 'Please enter chunk title.'
  },
  'Tiêu đề đoạn tối đa 200 ký tự.': {
    vi: 'Tiêu đề đoạn tối đa 200 ký tự.',
    en: 'Chunk title must be at most 200 characters.'
  },
  'Nội dung đoạn tối đa 8000 ký tự.': {
    vi: 'Nội dung đoạn tối đa 8000 ký tự.',
    en: 'Chunk content must be at most 8000 characters.'
  },
  'Văn bản trích đoạn tối đa 12000 ký tự.': {
    vi: 'Văn bản trích đoạn tối đa 12000 ký tự.',
    en: 'Original excerpt must be at most 12000 characters.'
  },
  'Vị trí trích đoạn tối đa 500 ký tự.': {
    vi: 'Vị trí trích đoạn tối đa 500 ký tự.',
    en: 'Locator must be at most 500 characters.'
  },
  'Không thể tạo nguồn tri thức.': {
    vi: 'Không thể tạo nguồn tri thức.',
    en: 'Unable to create knowledge source.'
  },
  'Không thể lưu bản nháp.': {
    vi: 'Không thể lưu bản nháp.',
    en: 'Unable to save draft.'
  },
  'Không thể tải phiên bản nguồn tri thức.': {
    vi: 'Không thể tải phiên bản nguồn tri thức.',
    en: 'Unable to load knowledge source revision.'
  },
  'Không thể tải lại phiên bản.': {
    vi: 'Không thể tải lại phiên bản.',
    en: 'Unable to reload revision.'
  },
  'Không tìm thấy mã phiên bản.': {
    vi: 'Không tìm thấy mã phiên bản.',
    en: 'Revision ID not found.'
  }
};

for (const [key, val] of Object.entries(dictionary)) {
  vi[key] = val.vi;
  en[key] = val.en;
}

fs.writeFileSync(viPath, JSON.stringify(vi, null, 2) + '\n', 'utf8');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');

console.log(`Successfully applied ${Object.keys(dictionary).length} governance translations to vi and en.`);
