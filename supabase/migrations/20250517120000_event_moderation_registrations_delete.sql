-- Allow students to remove their own event registration (unregister)
CREATE POLICY registrations_delete_own ON public.registrations
FOR DELETE TO authenticated
USING (student_id = auth.uid());

-- Moderate campus-wide listings: admins update/delete any event
CREATE POLICY events_update_admin ON public.events
FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY events_delete_admin ON public.events
FOR DELETE TO authenticated
USING (public.is_admin());
