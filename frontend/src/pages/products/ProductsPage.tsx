import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, ReloadOutlined, TagsOutlined, ShoppingCartOutlined, BarChartOutlined } from "@ant-design/icons";

import { useAuthState } from "../../app/auth";
import { hasAnyRole, hasRole } from "../../app/roles";
import { usePagination } from "../../shared/hooks/usePagination";
import { useProductPrototypeState } from "./modules/useProductPrototypeState";
import { useProductsQuery } from "./modules/useProductsQuery";
import { createDefaultProductFilters, type ProductRecord } from "./modules/types";

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0
  }).format(amount);
}

function productTypeSummary(product: ProductRecord) {
  if (product.productType === "DURATION") {
    return `기간형 · ${product.validityDays ?? "-"}일`;
  }
  return `횟수형 · ${product.totalCount ?? "-"}회`;
}

function productCategoryLabel(category: ProductRecord["productCategory"]) {
  if (category === "MEMBERSHIP") return "회원권";
  if (category === "PT") return "PT";
  if (category === "GX") return "그룹수업";
  if (category === "ETC") return "기타";
  return "미분류";
}

const categoryOptions = [
  { label: "전체 분류", value: "" },
  { label: "회원권", value: "MEMBERSHIP" },
  { label: "PT", value: "PT" },
  { label: "그룹수업", value: "GX" },
  { label: "기타", value: "ETC" }
];

const statusOptions = [
  { label: "전체 상태", value: "" },
  { label: "활성", value: "ACTIVE" },
  { label: "비활성", value: "INACTIVE" }
];

export default function ProductsPage() {
  const { authUser, isMockMode } = useAuthState();
  const {
    productFilters,
    setProductFilters,
    selectedProductId,
    selectedProduct,
    productForm,
    setProductForm,
    productFormMode,
    productFormOpen,
    productFormSubmitting,
    productPanelMessage,
    productPanelError,
    productFormError,
    clearProductFeedback,
    startCreateProduct,
    openProductEditor,
    closeProductForm,
    handleProductSubmit,
    handleProductStatusToggle
  } = useProductPrototypeState();

  const {
    products,
    productsLoading,
    productsQueryError,
    refetchProducts
  } = useProductsQuery(productFilters);

  const canReadLiveProducts = isMockMode || hasAnyRole(authUser, ["ROLE_MANAGER", "ROLE_DESK"]);
  const canMutateProducts = isMockMode || hasRole(authUser, "ROLE_MANAGER");

  const productsPagination = usePagination(products, {
    initialPageSize: 10,
    resetDeps: [products.length, productFilters.category, productFilters.status]
  });

  useEffect(() => {
    if (!canMutateProducts && productFormOpen) {
      closeProductForm();
    }
  }, [canMutateProducts, closeProductForm, productFormOpen]);

  async function runSubmit() {
    await handleProductSubmit();
  }

  async function runStatusToggle() {
    await handleProductStatusToggle();
  }

  const productColumns: ColumnsType<ProductRecord> = [
    {
      title: "상품 정보",
      key: "product",
      render: (_, product) => (
        <Space direction="vertical" size={2}>
          <Text strong style={{ fontSize: "0.95rem" }}>{product.productName}</Text>
          <Text type="secondary" style={{ fontSize: "0.75rem" }}>
            ID: #{product.productId} · {productTypeSummary(product)}
          </Text>
        </Space>
      )
    },
    {
      title: "분류",
      dataIndex: "productCategory",
      key: "category",
      render: (category) => <Tag color="blue">{productCategoryLabel(category)}</Tag>
    },
    {
      title: "가격",
      dataIndex: "priceAmount",
      key: "priceAmount",
      align: "right",
      render: (priceAmount) => <Text strong>{formatCurrency(priceAmount)}</Text>
    },
    {
      title: "상태",
      dataIndex: "productStatus",
      key: "productStatus",
      align: "right",
      render: (status) => <Tag color={status === "ACTIVE" ? "success" : "default"}>{status === "ACTIVE" ? "활성" : "비활성"}</Tag>
    },
    {
      title: "액션",
      key: "actions",
      align: "right",
      render: (_, product) =>
        canMutateProducts ? (
          <Button size="small" onClick={() => openProductEditor(product)}>
            상세/수정
          </Button>
        ) : null
    }
  ];

  const activeProductCount = products.filter((product) => product.productStatus === "ACTIVE").length;
  const averagePrice = products.length > 0
    ? formatCurrency(Math.floor(products.reduce((acc, product) => acc + product.priceAmount, 0) / products.length))
    : "0";

  return (
    <Flex vertical gap={24}>
      <Card>
        <Flex justify="space-between" align="start" wrap="wrap" gap={16}>
          <Space direction="vertical" size={4}>
            <Text type="secondary" style={{ fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#1677ff" }}>
              상품 카탈로그
            </Text>
            <Title level={2} style={{ margin: 0 }}>
              상품 및 서비스 관리
            </Title>
            <Paragraph type="secondary" style={{ margin: 0, maxWidth: 640 }}>
              회원권, PT, 그룹수업 상품을 등록하고 판매 정책을 개별 설정할 수 있습니다.
            </Paragraph>
            <Space wrap className="mt-xs">
              <Tag color="blue">카탈로그 필터</Tag>
              <Tag color="cyan">상태 제어</Tag>
              <Tag color="purple">판매 정책 연동</Tag>
            </Space>
          </Space>
          {canMutateProducts && (
            <Button type="primary" size="large" icon={<PlusOutlined />} onClick={startCreateProduct}>
              신규 상품 등록
            </Button>
          )}
        </Flex>
      </Card>

      <Row gutter={[16, 16]}>
        {[
          { label: "전체 상품", value: products.length, hint: "카탈로그 등록 총계", icon: <TagsOutlined /> },
          { label: "활성 상품", value: activeProductCount, hint: "현재 판매 가능", color: "#52c41a", icon: <ShoppingCartOutlined /> },
          { label: "평균 판매가", value: averagePrice, hint: "조회 상품 기준", color: "#1677ff", icon: <BarChartOutlined /> },
          { label: "시스템 권한", value: canMutateProducts ? "풀 액세스" : "조회 전용", hint: canMutateProducts ? "수정 가능" : "작업 제한" }
        ].map((stat) => (
          <Col xs={12} sm={6} key={stat.label}>
            <Card>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase" }}>{stat.label}</Text>}
                value={stat.value}
                valueStyle={{ fontWeight: 800, color: stat.color }}
                prefix={stat.icon}
                suffix={<Text type="secondary" style={{ fontSize: "0.75rem", display: "block" }}>{stat.hint}</Text>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        title={
          <Space direction="vertical" size={2}>
            <Title level={5} style={{ margin: 0 }}>상품 목록</Title>
            <Text type="secondary" style={{ fontSize: "0.84rem" }}>분류와 상태에 따라 상품을 관리합니다.</Text>
          </Space>
        }
      >
        <Flex vertical gap={16}>
          <Form layout="vertical">
            <Row gutter={16}>
              <Col xs={12} sm={6}>
                <Form.Item label="상품 분류" style={{ marginBottom: 0 }}>
                  <Select
                    value={productFilters.category}
                    onChange={(val) => setProductFilters(prev => ({ ...prev, category: val as any }))}
                    options={categoryOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={12} sm={6}>
                <Form.Item label="판매 상태" style={{ marginBottom: 0 }}>
                  <Select
                    value={productFilters.status}
                    onChange={(val) => setProductFilters(prev => ({ ...prev, status: val as any }))}
                    options={statusOptions}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Flex justify="flex-end" gap={8} style={{ height: "100%", alignItems: "flex-end" }}>
                  <Button
                    disabled={!canReadLiveProducts}
                    onClick={() => {
                      clearProductFeedback();
                      const nextFilters = createDefaultProductFilters();
                      setProductFilters(nextFilters);
                      void refetchProducts();
                    }}
                  >
                    필터 초기화
                  </Button>
                  <Button
                    type="primary"
                    onClick={() => void refetchProducts()}
                    loading={productsLoading}
                    disabled={!canReadLiveProducts}
                  >
                    적용
                  </Button>
                </Flex>
              </Col>
            </Row>
          </Form>

          {!canReadLiveProducts && (
            <Alert
              type="warning"
              showIcon
              message="운영 권한 제한"
              description="현재 권한에서는 상품 정보를 조회할 수 없습니다."
            />
          )}

          {productPanelMessage && <Alert type="success" showIcon message={productPanelMessage} closable />}
          {(productPanelError || productsQueryError) && (
            <Alert type="error" showIcon message={productPanelError ?? productsQueryError} closable />
          )}

          <Table<ProductRecord>
            rowKey="productId"
            loading={productsLoading}
            columns={productColumns}
            dataSource={productsPagination.pagedItems}
            pagination={{
              current: productsPagination.page,
              pageSize: productsPagination.pageSize,
              total: productsPagination.totalItems,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              onChange: (page, pageSize) => {
                productsPagination.setPage(page);
                productsPagination.setPageSize(pageSize);
              }
            }}
            locale={{ emptyText: "등록된 상품이 없습니다." }}
            scroll={{ x: 800 }}
          />
        </Flex>
      </Card>

      <Modal
        open={productFormOpen}
        onCancel={closeProductForm}
        title={productFormMode === "create" ? "신규 상품 등록" : `상품 #${selectedProductId} 수정 및 상세`}
        footer={[
          <Button key="cancel" onClick={closeProductForm}>취소</Button>,
          <Button key="submit" type="primary" onClick={() => void runSubmit()} loading={productFormSubmitting}>
            저장
          </Button>
        ]}
        width={700}
      >
        <Flex vertical gap={24} style={{ marginTop: 16 }}>
          {productFormMode === "edit" && selectedProduct && (
            <Flex justify="flex-end">
              <Button
                danger={selectedProduct.productStatus === "ACTIVE"}
                disabled={productFormSubmitting || !canMutateProducts}
                onClick={() => void runStatusToggle()}
              >
                {selectedProduct.productStatus === "ACTIVE" ? "상품 비활성화" : "상품 활성화"}
              </Button>
            </Flex>
          )}

          {productFormError && <Alert type="error" showIcon message={productFormError} style={{ marginBottom: 8 }} />}

          <Form layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="상품명" required>
                  <Input
                    placeholder="상품명을 입력하세요"
                    value={productForm.productName}
                    onChange={(e) => setProductForm(prev => ({ ...prev, productName: e.target.value }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="분류" required>
                  <Select
                    value={productForm.productCategory || undefined}
                    onChange={(val) => setProductForm(prev => ({ ...prev, productCategory: val as any }))}
                    placeholder="분류 선택"
                    options={categoryOptions.filter(o => o.value !== "")}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="상품 유형" required>
                  <Select
                    value={productForm.productType}
                    onChange={(val) => setProductForm(prev => ({ ...prev, productType: val as any }))}
                    options={[
                      { label: "기간형", value: "DURATION" },
                      { label: "횟수형", value: "COUNT" }
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="판매 금액" required>
                  <Input
                    type="number"
                    suffix="원"
                    value={productForm.priceAmount}
                    onChange={(e) => setProductForm(prev => ({ ...prev, priceAmount: e.target.value }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="유효 기간(일)" required={productForm.productType === "DURATION"}>
                  <Input
                    type="number"
                    disabled={productForm.productType !== "DURATION"}
                    value={productForm.validityDays}
                    onChange={(e) => setProductForm(prev => ({ ...prev, validityDays: e.target.value }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="총 이용 횟수" required={productForm.productType === "COUNT"}>
                  <Input
                    type="number"
                    disabled={productForm.productType !== "COUNT"}
                    value={productForm.totalCount}
                    onChange={(e) => setProductForm(prev => ({ ...prev, totalCount: e.target.value }))}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Card size="small" title={<Text strong>운영 및 정기 정책</Text>} style={{ background: "#fafafa" }}>
              <Flex vertical gap={16}>
                <Space size="large">
                  <Checkbox
                    checked={productForm.allowHold}
                    onChange={(e) => setProductForm(prev => ({ ...prev, allowHold: e.target.checked }))}
                  >
                    홀딩(일시정지) 허용
                  </Checkbox>
                  <Checkbox
                    checked={productForm.allowTransfer}
                    onChange={(e) => setProductForm(prev => ({ ...prev, allowTransfer: e.target.checked }))}
                  >
                    타인 양도 허용
                  </Checkbox>
                </Space>
                {productForm.allowHold && (
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item label="최대 홀딩 일수" style={{ marginBottom: 0 }}>
                        <Input
                          type="number"
                          value={productForm.maxHoldDays}
                          onChange={(e) => setProductForm(prev => ({ ...prev, maxHoldDays: e.target.value }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="최대 홀딩 횟수" style={{ marginBottom: 0 }}>
                        <Input
                          type="number"
                          value={productForm.maxHoldCount}
                          onChange={(e) => setProductForm(prev => ({ ...prev, maxHoldCount: e.target.value }))}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={24}>
                      <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                        <Checkbox
                          checked={productForm.allowHoldBypass}
                          onChange={(e) => setProductForm(prev => ({ ...prev, allowHoldBypass: e.target.checked }))}
                        >
                          관리자 제한 우회 홀딩 허용
                        </Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                )}
              </Flex>
            </Card>

            <Form.Item label="내부 운영 설명" style={{ marginTop: 16, marginBottom: 0 }}>
              <TextArea
                rows={4}
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="환불 기준이나 배정 유의사항 등"
              />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    </Flex>
  );
}
