import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto, UpdateTaskStatusDto, TaskListQueryDto } from './dto/task.dto';

@Injectable()
export class TaskService {
  constructor(private readonly prisma: PrismaService) {}

  private includeEmployee = {
    employee: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        photoUrl: true,
        unit: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    },
  };

  async list(query: TaskListQueryDto) {
    const { employeeId, priority, status, search, from, to, page = 1, pageSize = 20 } = query;

    const where: Record<string, unknown> = {};

    if (employeeId) where.employeeId = employeeId;
    if (priority) where.priority = priority;
    if (status) where.status = status;
    if (from || to) {
      where.dueDate = {};
      if (from) (where.dueDate as Record<string, unknown>).gte = new Date(from);
      if (to) (where.dueDate as Record<string, unknown>).lte = new Date(to);
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          employee: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: this.includeEmployee,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async find(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: this.includeEmployee,
    });
    if (!task) throw new NotFoundException('Görev bulunamadı');
    return task;
  }

  async create(dto: CreateTaskDto, createdById?: string) {
    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        employeeId: dto.employeeId,
        priority: dto.priority ?? 'MEDIUM',
        status: dto.status ?? 'TODO',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        note: dto.note,
        createdById,
        updatedById: createdById,
      },
      include: this.includeEmployee,
    });
  }

  async update(id: string, dto: UpdateTaskDto, updatedById?: string) {
    await this.find(id);
    return this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        employeeId: dto.employeeId,
        priority: dto.priority,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        note: dto.note,
        updatedById,
      },
      include: this.includeEmployee,
    });
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto, updatedById?: string) {
    await this.find(id);
    const extra: Record<string, unknown> = {};
    if (dto.status === 'DONE') extra.completedAt = new Date();
    if (dto.status === 'CANCELLED') extra.cancelledAt = new Date();

    return this.prisma.task.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.note ? { note: dto.note } : {}),
        ...extra,
        updatedById,
      },
      include: this.includeEmployee,
    });
  }

  async remove(id: string) {
    await this.find(id);
    return this.prisma.task.delete({ where: { id } });
  }
}
