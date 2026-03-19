import { Response } from 'express'

export const Ok      = (res: Response, data: unknown) => res.status(200).json(data)
export const Created = (res: Response, data: unknown) => res.status(201).json(data)
export const NoContent = (res: Response)              => res.status(204).send()
