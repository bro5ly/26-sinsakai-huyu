export { errorCatalog, type ErrorCode } from "@sinsakai/shared/error-codes";
export { problemSchema, type Problem } from "@sinsakai/shared/problem";
export {
  createSessionRequestSchema,
  createUserRequestSchema,
  sessionSchema,
  sessionUserSchema,
  studentIdSchema,
  verificationCodeRequestSchema,
  verificationTokenRequestSchema,
  verificationTokenSchema,
  type CreateSessionRequest,
  type CreateUserRequest,
  type Session,
  type SessionUser,
  type VerificationCodeRequest,
  type VerificationToken,
  type VerificationTokenRequest,
} from "@sinsakai/shared/auth";
export {
  meSchema,
  myRentalsSchema,
  rentalSchema,
  rentalStateSchema,
  setPinRequestSchema,
  type Me,
  type MyRentals,
  type Rental,
  type RentalState,
  type SetPinRequest,
} from "@sinsakai/shared/me";
export { isGuessablePin } from "@sinsakai/shared/pin";
export {
  categoriesSchema,
  categorySchema,
  itemStateSchema,
  itemTypeDetailSchema,
  itemTypeSummarySchema,
  itemTypesSchema,
  type Categories,
  type Category,
  type ItemState,
  type ItemTypeDetail,
  type ItemTypes,
  type ItemTypeSummary,
} from "@sinsakai/shared/catalog";
export {
  currentTabletDeviceSchema,
  registerTabletDeviceRequestSchema,
  tabletDeviceSchema,
  tabletDevicesSchema,
  type CurrentTabletDevice,
  type RegisterTabletDeviceRequest,
  type TabletDevice,
  type TabletDevices,
} from "@sinsakai/shared/tablet-devices";
export {
  createTabletSessionRequestSchema,
  tabletItemRequestSchema,
  tabletSessionSchema,
  type CreateTabletSessionRequest,
  type TabletItemRequest,
  type TabletSession,
} from "@sinsakai/shared/tablet";
