import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Button } from '@/components/button/Button'
import { Badge, EmptyState, Modal } from '@/components/ui'
import { fireEvent } from '@testing-library/react'

describe('Button', () => {
  it('renders children and is disabled when loading', () => {
    render(<Button loading>Save</Button>)
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled()
  })
  it('renders variants', () => {
    const { rerender } = render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-red-600')
    rerender(<Button variant="outline">Cancel</Button>)
    expect(screen.getByRole('button')).toHaveClass('border')
  })
})

describe('Badge and EmptyState', () => {
  it('shows status text', () => {
    render(<Badge tone="success">Resolved</Badge>)
    expect(screen.getByText('Resolved')).toBeInTheDocument()
  })
  it('renders a modal dialog when open and closes via button', () => {
    const onClose = vi.fn()
    render(<Modal open title="Hello" onClose={onClose}><p>Body</p></Modal>)
    expect(screen.getByRole('dialog', { name: 'Hello' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
  it('shows empty state copy and action', () => {
    render(<EmptyState title="No purchases yet" body="Add one" action={<button>Add purchase</button>} />)
    expect(screen.getByText('No purchases yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add purchase' })).toBeInTheDocument()
  })
})
