import { prisma } from '../lib/prisma';
import {
  UserStatus,
  SubscriptionStatus,
  PurchaseStatus,
  PurchaseType,
  type Plan,
  type Prisma,
} from '@prisma/client';

const FIRST_NAMES = [
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Stella', 'Lucas', 'Isabella',
  'Mason', 'Mia', 'Oliver', 'Charlotte', 'Aiden', 'Amelia', 'Elijah', 'Harper', 'Alexander', 'Evelyn',
  'Benjamin', 'Abigail', 'Henry', 'Emily', 'Sebastian', 'Elizabeth', 'Jack', 'Sofia', 'Owen', 'Avery',
  'Daniel', 'Ella', 'Matthew', 'Scarlett', 'Samuel', 'Grace', 'David', 'Chloe', 'Joseph', 'Victoria',
  'Carter', 'Riley', 'Luke', 'Aria', 'Wyatt', 'Lily', 'Gabriel', 'Aubrey', 'Isaac', 'Zoey',
  'Leo', 'Penelope', 'Julian', 'Layla', 'Anthony', 'Nora', 'Jaxon', 'Camila', 'Lincoln', 'Hannah',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes',
];

const VEHICLE_MODELS = [
  { make: 'Toyota', model: 'RAV4' },
  { make: 'Honda', model: 'CR-V' },
  { make: 'Ford', model: 'F-150' },
  { make: 'Tesla', model: 'Model Y' },
  { make: 'Chevrolet', model: 'Silverado' },
  { make: 'Toyota', model: 'Camry' },
  { make: 'Honda', model: 'Civic' },
  { make: 'Subaru', model: 'Outback' },
  { make: 'BMW', model: 'X5' },
  { make: 'Mercedes-Benz', model: 'GLC 300' },
  { make: 'Audi', model: 'Q5' },
  { make: 'Hyundai', model: 'Tucson' },
  { make: 'Kia', model: 'Telluride' },
  { make: 'Jeep', model: 'Wrangler' },
  { make: 'Rivian', model: 'R1T' },
  { make: 'Volvo', model: 'XC90' },
  { make: 'Mazda', model: 'CX-5' },
  { make: 'Nissan', model: 'Rogue' },
  { make: 'Lexus', model: 'RX 350' },
  { make: 'Porsche', model: 'Macan' },
];

const COLORS = [
  'Midnight Black', 'Pearl White', 'Silver Metallic', 'Deep Blue', 'Ruby Red',
  'Charcoal Gray', 'Forest Green', 'Sonic Titanium', 'Lunar Rock', 'Glacier White',
];

async function seedPlans() {
  const platinum = await prisma.plan.upsert({
    where: { name: 'Unlimited Platinum' },
    update: {},
    create: {
      name: 'Unlimited Platinum',
      description: 'Unlimited washes, ceramic coating, tire shine, and interior vacuum.',
      priceCents: 3499,
      interval: 'MONTHLY',
    },
  });

  const express = await prisma.plan.upsert({
    where: { name: 'Express Clean Pass' },
    update: {},
    create: {
      name: 'Express Clean Pass',
      description: 'Unlimited exterior washes and spot-free rinse.',
      priceCents: 2499,
      interval: 'MONTHLY',
    },
  });

  const basic = await prisma.plan.upsert({
    where: { name: 'Basic Wash Pass' },
    update: {},
    create: {
      name: 'Basic Wash Pass',
      description: 'Standard exterior tunnel wash.',
      priceCents: 1499,
      interval: 'MONTHLY',
    },
  });

  return { platinum, express, basic };
}

async function seedPersona1(planId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Jordan Blake',
      email: 'jordan.blake@example.com',
      phone: '(555) 234-5678',
      status: UserStatus.OVERDUE,
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-101',
      make: 'Subaru',
      model: 'Outback',
      year: 2021,
      color: 'Abyss Blue',
    },
  });

  await prisma.subscription.create({
    data: {
      vehicleId: vehicle.id,
      planId,
      status: SubscriptionStatus.OVERDUE,
      nextBillingAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.purchase.createMany({
    data: [
      {
        userId: user.id,
        description: 'Unlimited Platinum — Monthly Renewal',
        amountCents: 3499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        description: 'Unlimited Platinum — Monthly Renewal (Card Declined)',
        amountCents: 3499,
        status: PurchaseStatus.FAILED,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedPersona2(planId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Michael Chang',
      email: 'michael.chang@example.com',
      phone: '(555) 876-5432',
      status: UserStatus.ACTIVE,
    },
  });

  const car1 = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-201',
      make: 'Honda',
      model: 'Civic',
      year: 2018,
      color: 'Lunar Silver',
    },
  });

  await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-202',
      make: 'Ford',
      model: 'F-150',
      year: 2024,
      color: 'Agate Black',
    },
  });

  await prisma.subscription.create({
    data: {
      vehicleId: car1.id,
      planId,
      status: SubscriptionStatus.ACTIVE,
      nextBillingAt: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.purchase.create({
    data: {
      userId: user.id,
      description: 'Express Clean Pass — Monthly Charge',
      amountCents: 2499,
      status: PurchaseStatus.PAID,
      type: PurchaseType.SUBSCRIPTION,
      createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
    },
  });
}

async function seedPersona3(planId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Samantha Reed',
      email: 'samantha.reed@example.com',
      phone: '(555) 345-6789',
      status: UserStatus.ACTIVE,
    },
  });

  const car = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-301',
      make: 'Tesla',
      model: 'Model 3',
      year: 2022,
      color: 'Pearl White',
    },
  });

  await prisma.subscription.create({
    data: {
      vehicleId: car.id,
      planId,
      status: SubscriptionStatus.ACTIVE,
      nextBillingAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    },
  });

  const purchases = buildSamanthaPurchases(user.id);
  await prisma.purchase.createMany({ data: purchases });
}

function buildMonthlyRenewals(userId: string, count: number): Prisma.PurchaseCreateManyInput[] {
  const renewals: Prisma.PurchaseCreateManyInput[] = [];
  for (let i = count; i >= 1; i--) {
    renewals.push({
      userId,
      description: 'Unlimited Platinum — Monthly Renewal',
      amountCents: 3499,
      status: PurchaseStatus.PAID,
      type: PurchaseType.SUBSCRIPTION,
      createdAt: new Date(Date.now() - (i * 30 + 5) * 24 * 60 * 60 * 1000),
    });
  }
  return renewals;
}

function buildSamanthaPurchases(userId: string): Prisma.PurchaseCreateManyInput[] {
  return [
    ...buildMonthlyRenewals(userId, 22),
    {
      userId,
      description: 'Single Ceramic Wash + Tire Shine',
      amountCents: 1800,
      status: PurchaseStatus.PAID,
      type: PurchaseType.SINGLE_WASH,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      description: 'Single Ceramic Wash + Tire Shine',
      amountCents: 1800,
      status: PurchaseStatus.PAID,
      type: PurchaseType.SINGLE_WASH,
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      userId,
      description: 'SUMMER_VIP Promo — Free Premium Wash',
      amountCents: 0,
      status: PurchaseStatus.PAID,
      type: PurchaseType.COUPON,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ];
}

async function seedPersona4Purchases(userId: string) {
  await prisma.purchase.createMany({
    data: [
      {
        userId,
        description: 'SPRING20 Coupon Redemption (100% Off Single Wash)',
        amountCents: 0,
        status: PurchaseStatus.PAID,
        type: PurchaseType.COUPON,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Single Ceramic Wash + Undercarriage Blast',
        amountCents: 1800,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SINGLE_WASH,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Basic Wash Pass — Monthly Renewal',
        amountCents: 1499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedPersona4(planId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'David Miller',
      email: 'david.miller@example.com',
      phone: '(555) 987-6543',
      status: UserStatus.ACTIVE,
    },
  });

  const car = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-401',
      make: 'Jeep',
      model: 'Grand Cherokee',
      year: 2020,
      color: 'Velvet Red',
    },
  });

  await prisma.subscription.create({
    data: {
      vehicleId: car.id,
      planId,
      status: SubscriptionStatus.ACTIVE,
      nextBillingAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    },
  });

  await seedPersona4Purchases(user.id);
}

async function seedPersona5Purchases(userId: string) {
  await prisma.purchase.createMany({
    data: [
      {
        userId,
        description: 'Unlimited Platinum — Monthly Renewal',
        amountCents: 3499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Express Clean Pass — Monthly Renewal',
        amountCents: 2499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 33 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Unlimited Platinum — Monthly Renewal (Card Declined)',
        amountCents: 3499,
        status: PurchaseStatus.FAILED,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Express Clean Pass — Monthly Renewal (Card Declined)',
        amountCents: 2499,
        status: PurchaseStatus.FAILED,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedPersona5(platinumId: string, expressId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Elena Rostova',
      email: 'elena.rostova@example.com',
      phone: '(555) 432-8765',
      status: UserStatus.OVERDUE,
      createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
  });

  const car1 = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-901',
      make: 'BMW',
      model: 'X5',
      year: 2022,
      color: 'Sonic Titanium',
    },
  });

  const car2 = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-902',
      make: 'Audi',
      model: 'Q5',
      year: 2021,
      color: 'Glacier White',
    },
  });

  await prisma.subscription.createMany({
    data: [
      {
        vehicleId: car1.id,
        planId: platinumId,
        status: SubscriptionStatus.OVERDUE,
        nextBillingAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        vehicleId: car2.id,
        planId: expressId,
        status: SubscriptionStatus.OVERDUE,
        nextBillingAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  await seedPersona5Purchases(user.id);
}

async function seedPersona6Purchases(userId: string) {
  await prisma.purchase.createMany({
    data: [
      {
        userId,
        description: 'Unlimited Platinum — Monthly Renewal',
        amountCents: 3499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Basic Wash Pass — Monthly Renewal',
        amountCents: 1499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 38 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Single Ceramic Wash + Tire Shine',
        amountCents: 1800,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SINGLE_WASH,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedMarcusVehicles(userId: string, platinumId: string, basicId: string) {
  const car1 = await prisma.vehicle.create({
    data: {
      userId,
      licensePlate: 'AMP-903',
      make: 'Tesla',
      model: 'Model Y',
      year: 2023,
      color: 'Deep Blue',
    },
  });

  const car2 = await prisma.vehicle.create({
    data: {
      userId,
      licensePlate: 'AMP-904',
      make: 'Subaru',
      model: 'Outback',
      year: 2020,
      color: 'Forest Green',
    },
  });

  await prisma.vehicle.create({
    data: {
      userId,
      licensePlate: 'AMP-905',
      make: 'Ford',
      model: 'F-150',
      year: 2017,
      color: 'Ruby Red',
    },
  });

  await prisma.subscription.createMany({
    data: [
      {
        vehicleId: car1.id,
        planId: platinumId,
        status: SubscriptionStatus.ACTIVE,
        nextBillingAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      },
      {
        vehicleId: car2.id,
        planId: basicId,
        status: SubscriptionStatus.ACTIVE,
        nextBillingAt: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedPersona6(platinumId: string, basicId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      phone: '(555) 678-1234',
      status: UserStatus.ACTIVE,
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  });

  await seedMarcusVehicles(user.id, platinumId, basicId);
  await seedPersona6Purchases(user.id);
}

async function seedPersona7(planId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Sophia Davis',
      email: 'sophia.davis@example.com',
      phone: '(555) 789-0123',
      status: UserStatus.OVERDUE,
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    },
  });

  const car = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-701',
      make: 'Mazda',
      model: 'CX-5',
      year: 2021,
      color: 'Soul Red',
    },
  });

  await prisma.subscription.create({
    data: {
      vehicleId: car.id,
      planId,
      status: SubscriptionStatus.CANCELLED,
      nextBillingAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.purchase.createMany({
    data: [
      {
        userId: user.id,
        description: 'Unlimited Platinum — Monthly Renewal',
        amountCents: 3499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      },
      {
        userId: user.id,
        description: 'Unlimited Platinum — Monthly Renewal (Card Declined)',
        amountCents: 3499,
        status: PurchaseStatus.FAILED,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

async function seedPersona8(planId: string) {
  const user = await prisma.user.create({
    data: {
      name: 'Carlos Ortiz',
      email: 'carlos.ortiz@example.com',
      phone: '(555) 890-1234',
      status: UserStatus.OVERDUE,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  });

  const car1 = await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-801',
      make: 'Chevrolet',
      model: 'Corvette',
      year: 2022,
      color: 'Torch Red',
    },
  });

  await prisma.vehicle.create({
    data: {
      userId: user.id,
      licensePlate: 'AMP-802',
      make: 'Chevrolet',
      model: 'Tahoe',
      year: 2020,
      color: 'Black',
    },
  });

  await prisma.subscription.create({
    data: {
      vehicleId: car1.id,
      planId,
      status: SubscriptionStatus.OVERDUE,
      nextBillingAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  await seedPersona8Purchases(user.id);
}

async function seedPersona8Purchases(userId: string) {
  await prisma.purchase.createMany({
    data: [
      {
        userId,
        description: 'Unlimited Platinum — Monthly Renewal',
        amountCents: 3499,
        status: PurchaseStatus.PAID,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 34 * 24 * 60 * 60 * 1000),
      },
      {
        userId,
        description: 'Unlimited Platinum — Monthly Renewal (Card Declined)',
        amountCents: 3499,
        status: PurchaseStatus.FAILED,
        type: PurchaseType.SUBSCRIPTION,
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      },
    ],
  });
}

function determineUserStatus(index: number): UserStatus {
  if (index % 7 === 0) return UserStatus.OVERDUE;
  if (index % 11 === 0) return UserStatus.INACTIVE;
  return UserStatus.ACTIVE;
}

async function createSyntheticSubscription(
  vehicleId: string,
  userStatus: UserStatus,
  plan: Plan
) {
  if (userStatus === UserStatus.INACTIVE) {
    await prisma.subscription.create({
      data: {
        vehicleId,
        planId: plan.id,
        status: SubscriptionStatus.CANCELLED,
        nextBillingAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });
    return;
  }

  const isOverdue = userStatus === UserStatus.OVERDUE;
  await prisma.subscription.create({
    data: {
      vehicleId,
      planId: plan.id,
      status: isOverdue ? SubscriptionStatus.OVERDUE : SubscriptionStatus.ACTIVE,
      nextBillingAt: new Date(
        Date.now() + (isOverdue ? -3 : 20) * 24 * 60 * 60 * 1000
      ),
    },
  });
}

async function createSyntheticPurchases(userId: string, userStatus: UserStatus, plan: Plan) {
  const purchases: Prisma.PurchaseCreateManyInput[] = [
    {
      userId,
      description: `${plan.name} — Monthly Pass Renewal`,
      amountCents: plan.priceCents,
      status: PurchaseStatus.PAID,
      type: PurchaseType.SUBSCRIPTION,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
  ];

  if (userStatus === UserStatus.OVERDUE) {
    purchases.push({
      userId,
      description: `${plan.name} — Recurring Charge (Declined)`,
      amountCents: plan.priceCents,
      status: PurchaseStatus.FAILED,
      type: PurchaseType.SUBSCRIPTION,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    });
  }

  await prisma.purchase.createMany({ data: purchases });
}

async function seedSingleSyntheticCustomer(
  index: number,
  plans: Plan[]
) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  const status = determineUserStatus(index);
  const selectedPlan = plans[index % plans.length];

  const user = await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index + 10}@example.com`,
      phone: `(555) ${100 + (index % 900)}-${1000 + (index % 9000)}`,
      status,
      createdAt: new Date(Date.now() - (60 - index) * 24 * 60 * 60 * 1000),
    },
  });

  const carCount = index % 5 === 0 ? 2 : index % 13 === 0 ? 0 : 1;
  for (let c = 0; c < carCount; c++) {
    const vModel = VEHICLE_MODELS[(index + c) % VEHICLE_MODELS.length];
    const color = COLORS[(index + c) % COLORS.length];
    const plateNum = 500 + index * 2 + c;

    const vehicle = await prisma.vehicle.create({
      data: {
        userId: user.id,
        licensePlate: `AMP-${plateNum}`,
        make: vModel.make,
        model: vModel.model,
        year: 2016 + ((index + c) % 9),
        color,
      },
    });

    if (c === 0 && status !== UserStatus.INACTIVE) {
      await createSyntheticSubscription(vehicle.id, status, selectedPlan);
    }
  }

  if (carCount > 0) {
    await createSyntheticPurchases(user.id, status, selectedPlan);
  }
}

async function seedSyntheticCohort(plans: Plan[], count = 60) {
  for (let i = 0; i < count; i++) {
    await seedSingleSyntheticCustomer(i, plans);
  }
}

async function cleanDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();
}

export async function main() {
  await cleanDatabase();
  const plans = await seedPlans();
  const planList = [plans.platinum, plans.express, plans.basic];

  await seedPersona1(plans.platinum.id);
  await seedPersona2(plans.express.id);
  await seedPersona3(plans.platinum.id);
  await seedPersona4(plans.basic.id);
  await seedPersona5(plans.platinum.id, plans.express.id);
  await seedPersona6(plans.platinum.id, plans.basic.id);
  await seedPersona7(plans.platinum.id);
  await seedPersona8(plans.platinum.id);

  await seedSyntheticCohort(planList, 60);
}

if (process.env.NODE_ENV !== 'test') {
  main()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
